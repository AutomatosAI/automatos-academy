// Wire assembly (PRD-WIRE §4.2) — the agent-verified news surface: ingest +
// publish/unpublish/corrections writes under /api/wire (X-Wire-Key), public
// reads, and the /wire/rss.xml feed.
//
// Only ever imported when WIRE_INGEST_KEY is set (server.js dynamic-imports
// it), so the default academy boot stays byte-identical to today. Same
// fail-loud posture as the Spine: enabled-but-half-configured must never
// limp into serving.
//
// Every dependency with an outside edge is injectable for tests:
//   pool          — pg Pool (default: from DATABASE_URL; server.js passes the
//                   Spine's pool in when that add-on mounted, so a full deploy
//                   runs ONE pool — the /api/catalog/stats sharing posture)
//   publishPolicy — "review" (D-W1 launch default: ingest lands draft, a
//                   human publish call approves) | "auto" (missions publish
//                   directly; flips the transparency label per D-W5)
//   rateLimit     — {max, windowMs} (default: 60/min per IP on writes)
import { createWirePool } from "./db.js";
import { createKeyGuard } from "./auth.js";
import { createIpRateLimiter } from "./rate-limit.js";
import { createWireRouter } from "./routes.js";
import { createRssHandler } from "./rss.js";
import { transparencyLabel } from "./label.js";
import { errorHandler } from "./http.js";

export function mountWire(app, opts = {}) {
  const { ingestKey } = opts;
  if (!ingestKey) throw new Error("[wire] mountWire requires the WIRE_INGEST_KEY value");
  const publishPolicy = opts.publishPolicy || "review";
  if (publishPolicy !== "review" && publishPolicy !== "auto") {
    throw new Error(`[wire] WIRE_PUBLISH_POLICY must be 'review' or 'auto' (got '${publishPolicy}')`);
  }

  const pool = opts.pool || createWirePool(process.env.DATABASE_URL);
  const label = transparencyLabel(publishPolicy);
  const requireKey = createKeyGuard(ingestKey);
  const limiter = createIpRateLimiter(opts.rateLimit);

  app.use("/api/wire", createWireRouter({ pool, requireKey, limiter, publishPolicy, label }), errorHandler);
  app.get("/wire/rss.xml", createRssHandler({ pool, label }));

  return { pool, publishPolicy, label };
}
