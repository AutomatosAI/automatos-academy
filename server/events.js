// LX-5 — the first-party funnel receiver (PRD-WAVE-LEARNER-UX).
//
// The client beacon (public/js/analytics.js, PRD-GROWTH §3) existed for a
// year pointing at an endpoint nobody ever chose — every event a silent
// no-op. This is that endpoint: same-origin, allowlisted, identity-free.
//
//   POST /api/events        — public, rate-limited, append-only
//   GET  /api/admin/funnel  — admin-role summary: step counts + drop-off
//
// Privacy stance is the beacon's own, kept deliberately: no cookies, no
// user ids, no IP storage. `session` is a per-pageload random id, enough
// for within-visit drop-off and nothing more.

import express from "express";

// The single vocabulary (analytics.js header comment) + this wave's three.
const EVENTS = new Set([
  "page_view", "track_start", "module_complete", "mock_start", "mock_score",
  "readiness_a_plus", "badge_claim", "badge_view", "cta_automatos_click",
  "notify_me", "tutor_message", "tutor_error", "tutor_consent",
  "tutor_deep_link", "path_finder", "pace_line_shown", "exam_date_set",
  "account_ask_shown", "account_ask_clicked", "account_ask_dismissed",
  // LX-5 additions — the funnel's missing steps
  "lesson_opened", "first_question_answered", "signed_in",
]);

const MAX_PROPS_BYTES = 2048;
const MAX_PATH = 300;
const MAX_SESSION = 64;

// Funnel steps for the admin summary, in order.
const FUNNEL = ["page_view", "path_finder", "track_start", "lesson_opened", "first_question_answered", "signed_in"];

/** tiny fixed-window IP limiter — analytics volume, not auth traffic */
function ipLimiter({ max = 120, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "?";
    const h = hits.get(key);
    if (!h || now - h.t0 > windowMs) { hits.set(key, { t0: now, n: 1 }); return next(); }
    if (++h.n > max) return res.status(429).json({ error: "rate_limited" });
    next();
  };
}

export function mountFunnelEvents(app, { pool, auth, requireRole }) {
  const limiter = ipLimiter();

  app.post("/api/events", limiter, express.json({ limit: "4kb" }), async (req, res) => {
    const b = req.body || {};
    if (!EVENTS.has(b.event)) return res.status(400).json({ error: "event_unknown" });
    let props = {};
    if (b.props && typeof b.props === "object" && !Array.isArray(b.props)) {
      const raw = JSON.stringify(b.props);
      if (raw.length <= MAX_PROPS_BYTES) props = b.props;
    }
    const path = typeof b.path === "string" ? b.path.slice(0, MAX_PATH) : null;
    const session = typeof b.session === "string" ? b.session.slice(0, MAX_SESSION) : null;
    const clientAt = Number.isFinite(b.at) ? new Date(b.at) : null;
    try {
      await pool.query(
        `INSERT INTO funnel_events (event, client_at, path, session, props) VALUES ($1, $2, $3, $4, $5)`,
        [b.event, clientAt, path, session, JSON.stringify(props)],
      );
    } catch (_) { /* analytics must never 500 the client */ }
    res.status(204).end();
  });

  app.get("/api/admin/funnel", auth, requireRole("admin"), async (req, res) => {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    const { rows } = await pool.query(
      `SELECT event, count(*)::int AS n, count(DISTINCT session)::int AS sessions
       FROM funnel_events WHERE at > now() - ($1 || ' days')::interval
       GROUP BY event ORDER BY n DESC`,
      [days],
    );
    const byEvent = Object.fromEntries(rows.map((r) => [r.event, r]));
    const steps = FUNNEL.map((e) => ({ step: e, count: byEvent[e]?.n || 0, sessions: byEvent[e]?.sessions || 0 }));
    res.json({ days, steps, all: rows });
  });

  return { events: EVENTS.size };
}
