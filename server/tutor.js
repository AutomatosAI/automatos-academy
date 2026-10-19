// LX-15 — the tutor proxy (PRD-WAVE-LEARNER-UX, D-LX7).
//
// Until this module, the web tutor POSTed straight to the platform's widget
// endpoint with a public key shipped to every browser — no auth, no metering,
// no ceiling on what an anonymous visitor could spend. The Academy is ONE
// Automatos workspace, so the platform cannot tell learners apart; the only
// place identity exists is here (Clerk). The proxy therefore:
//
//   • verifies the learner (spine auth middleware),
//   • counts the question atomically against the UTC-day quota (D-LX5:
//     10/day default, TUTOR_DAILY_LIMIT overrides),
//   • forwards to the platform and streams the SSE straight back,
//   • REFUNDS the count if the upstream never took the request — a question
//     that no model saw must not cost the learner a question,
//   • stops shipping the widget key to browsers (proxy deploys hydrate
//     chat-config with proxy:true and no key).
//
//   POST /api/tutor/chat       — auth; 429 {error:"quota"} past the limit
//   GET  /api/tutor/allowance  — auth; { limit, used, remaining, resetsAt }
//
// The upstream call names the Academy's origin. The widget API denies an
// ak_pub_ key that arrives with no Origin/Referer (automatos-ai
// orchestrator/api/widgets/auth.py, P2-13 "fail closed"), then matches the
// origin's host against the key's allowed_domains. A browser adds Origin by
// itself; Node's fetch never does, so without it every proxied question came
// back 403 → 502 upstream_error. ACADEMY_CHAT_ORIGIN overrides the default.

import { Readable } from "stream";

const DEFAULT_LIMIT = 10;
const DEFAULT_KEY = "ak_pub_267f4a7135d136ac8cfce0c193f3b52715d72346b3e0f5df8af55eec7508b9a3";
const DEFAULT_AGENT = "bdfe4212-bd85-4875-8b9a-27c16c1b938c";
const DEFAULT_API = "https://api.automatos.app";
export const DEFAULT_ORIGIN = "https://academy.automatos.app";

const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const nextUtcMidnight = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
};

// Reduce ACADEMY_CHAT_ORIGIN to a bare scheme://host[:port] origin. A value
// that is not an absolute http(s) URL is a misconfiguration: say so in the
// boot log and keep the tutor on the Academy's own origin rather than send a
// header the platform would refuse.
function chatOrigin(raw) {
  if (!raw) return DEFAULT_ORIGIN;
  let url;
  try { url = new URL(raw); } catch (_) { url = null; }
  if (url && (url.protocol === "https:" || url.protocol === "http:")) return url.origin;
  console.warn(`[tutor] ACADEMY_CHAT_ORIGIN=${JSON.stringify(raw)} is not an absolute http(s) URL — using ${DEFAULT_ORIGIN}`);
  return DEFAULT_ORIGIN;
}

export function tutorConfig(env = process.env) {
  return {
    limit: Math.max(1, parseInt(env.TUTOR_DAILY_LIMIT, 10) || DEFAULT_LIMIT),
    key: env.ACADEMY_CHAT_PUBLIC_KEY || DEFAULT_KEY,
    agentId: env.ACADEMY_CHAT_AGENT_ID || DEFAULT_AGENT,
    apiBase: (env.ACADEMY_CHAT_API_BASE || DEFAULT_API).replace(/\/$/, ""),
    origin: chatOrigin(env.ACADEMY_CHAT_ORIGIN),
  };
}

export function mountTutorProxy(app, { pool, auth, env = process.env, fetchImpl = fetch }) {
  const cfg = tutorConfig(env);

  app.get("/api/tutor/allowance", auth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT count FROM tutor_usage WHERE user_id = $1 AND day = $2`,
      [req.spineUser.id, utcDay()],
    );
    const used = rows[0] ? rows[0].count : 0;
    res.json({ limit: cfg.limit, used, remaining: Math.max(0, cfg.limit - used), resetsAt: nextUtcMidnight() });
  });

  app.post("/api/tutor/chat", auth, async (req, res) => {
    const userId = req.spineUser.id;
    const message = (req.body || {}).message;
    if (typeof message !== "string" || !message.trim() || message.length > 8000) {
      return res.status(400).json({ error: "message_invalid" });
    }
    const day = utcDay();

    // count first, atomically — two tabs racing both get honest answers
    const { rows } = await pool.query(
      `INSERT INTO tutor_usage (user_id, day, count) VALUES ($1, $2, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET count = tutor_usage.count + 1
       RETURNING count`,
      [userId, day],
    );
    const count = rows[0].count;
    if (count > cfg.limit) {
      // roll the over-limit increment back so `used` never exceeds the limit
      await pool.query(`UPDATE tutor_usage SET count = $3 WHERE user_id = $1 AND day = $2`, [userId, day, cfg.limit]).catch(() => {});
      return res.status(429).json({ error: "quota", limit: cfg.limit, resetsAt: nextUtcMidnight() });
    }

    const refund = () =>
      pool.query(`UPDATE tutor_usage SET count = GREATEST(count - 1, 0) WHERE user_id = $1 AND day = $2`, [userId, day]).catch(() => {});

    let upstream;
    try {
      upstream = await fetchImpl(`${cfg.apiBase}/api/widgets/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.key}`,
          Origin: cfg.origin,
          Referer: `${cfg.origin}/`,
        },
        body: JSON.stringify({
          message,
          conversation_id: (req.body || {}).conversation_id || undefined,
          agent_id: cfg.agentId || undefined,
        }),
      });
    } catch (_) {
      await refund();
      return res.status(502).json({ error: "upstream_unreachable" });
    }
    if (!upstream.ok || !upstream.body) {
      await refund();
      return res.status(502).json({ error: "upstream_error", status: upstream.status });
    }

    res.status(200);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "text/event-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Tutor-Remaining", String(Math.max(0, cfg.limit - count)));
    res.setHeader("X-Tutor-Limit", String(cfg.limit));
    Readable.fromWeb(upstream.body).pipe(res);
  });

  return { limit: cfg.limit, origin: cfg.origin };
}
