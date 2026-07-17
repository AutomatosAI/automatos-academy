// Digest HTTP surface (PRD-DIGEST §4.4 + §4.1):
//   GET/POST /digest/unsubscribe?u&t — tokened, works signed-out, no
//     confirmation dance (US-D2). POST is the RFC 8058 one-click target.
//   POST /api/digest/run             — admin-secret manual/backfill trigger;
//     same ledger as the tick, so it can never double-send.
import { timingSafeEqual } from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const page = (title, body) => `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — Automatos Academy</title>
<body style="margin:0;padding:48px 20px;background:#eef2fa;font-family:Helvetica,Arial,sans-serif;color:#1c2740;">
<div style="max-width:460px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;">
<h1 style="margin:0 0 12px;font-size:20px;">${title}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#40506e;">${body}</p>
</div></body>`;

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function registerDigestRoutes(app, { pool, adminKey, runNow }) {
  const unsubscribe = async (req, res) => {
    const { u, t } = req.query;
    if (!UUID_RE.test(String(u || "")) || !UUID_RE.test(String(t || ""))) {
      return res.status(200).send(page("That link didn't work", "This unsubscribe link is incomplete or has expired. If you still get the weekly email, turn it off in your Academy profile — one toggle, instant."));
    }
    const r = await pool.query(
      "UPDATE user_prefs SET digest_enabled = false, updated_at = now() WHERE user_id = $1 AND unsub_token = $2",
      [u, t],
    );
    // An already-rotated token lands here too — same honest answer either way.
    if (!r.rowCount) {
      return res.status(200).send(page("That link has expired", "It may be from an older email. If you still get the weekly digest, turn it off in your Academy profile — one toggle, instant."));
    }
    return res.status(200).send(page("You're unsubscribed", "No more weekly emails. Your progress keeps recording exactly as before, and you can turn the digest back on from your profile any time."));
  };

  app.get("/digest/unsubscribe", (req, res, next) => unsubscribe(req, res).catch(next));
  // RFC 8058 one-click: mail clients POST with no body we need to read.
  app.post("/digest/unsubscribe", (req, res, next) => unsubscribe(req, res).catch(next));

  app.post("/api/digest/run", (req, res, next) => {
    (async () => {
      const presented = req.headers["x-digest-admin-key"];
      if (!presented || !safeEqual(presented, adminKey)) {
        return res.status(403).json({ ok: false, error: "forbidden" });
      }
      const summary = await runNow();
      return res.json({ ok: true, data: summary });
    })().catch(next);
  });
}
