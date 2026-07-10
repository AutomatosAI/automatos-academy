// Server-derived mastery roll-ups (PRD-MT-02 US-024, 02 §5 gap #8).
//
// After every progress reconcile the Spine re-derives mastery_map from the
// authoritative merged item states — clients NEVER write competence. Domain
// scopes use the ported readiness math over the track's progress rows; path
// scopes roll up across every domain a path touches (03 §2), with membership
// and blueprint weights read from the same content index the catalog serves
// (server/catalog.js buildContentIndex — one source of truth for both).
//
// `competence` is stored RAW; `decay_at` is the latest device wall-clock
// answer in scope (last practice), and decay is applied on read (03 §2).
import { domainStatsFromRows, weightedCompetence } from "../engine/competence.js";
import { effectiveCompetence } from "../engine/decay.js";

// Scopes whose content this deploy doesn't know (client ahead of server
// content, or retired tracks) decay with a neutral mid weight.
export const DEFAULT_SCOPE_WEIGHT = 0.2;

const UPSERT_MASTERY_SQL = `
  INSERT INTO mastery_map (user_id, vendor_id, track_id, scope_type, scope_id, competence, decay_at, updated_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, now())
  ON CONFLICT ON CONSTRAINT mastery_map_scope_uniq
  DO UPDATE SET competence = EXCLUDED.competence, decay_at = EXCLUDED.decay_at, updated_at = now()
`;

/** All of a user's progress rows for one track, keyed by item_id. */
async function loadTrackRows(client, userId, vendorId, trackId) {
  const { rows } = await client.query(
    `SELECT item_id, seen, correct, answered_at FROM progress
     WHERE user_id = $1 AND vendor_id = $2 AND track_id = $3`,
    [userId, vendorId, trackId],
  );
  const map = new Map();
  for (const r of rows) {
    map.set(r.item_id, { seen: r.seen, correct: r.correct, answeredAtMs: new Date(r.answered_at).getTime() });
  }
  return map;
}

/** Latest wall-clock answer across the item ids a scope contains. */
function latestAnswerMs(rows, itemIds) {
  let latest = 0;
  for (const id of itemIds) {
    const r = rows.get(id);
    if (r && r.answeredAtMs > latest) latest = r.answeredAtMs;
  }
  return latest;
}

const domainItemIds = (domain) => [
  ...(domain.questions || []).map((q) => q.id),
  ...(domain.lessons || []).map((l) => l.id),
];

/**
 * Re-derive mastery_map for every scope the touched tracks feed: their
 * domain scopes, plus every path whose membership includes a touched track.
 * Runs inside the caller's transaction. Tracks the content index doesn't
 * know are skipped (their raw progress rows still hold the truth; roll-ups
 * appear once the content ships).
 *
 * @param {import("pg").PoolClient} client — inside BEGIN/COMMIT
 * @param {object} index — buildContentIndex() result
 * @param {string} userId — users.id (from the token, never the client)
 * @param {Iterable<string>} touchedTrackKeys — "vendorId/trackId"
 * @returns {Promise<Array>} the upserted rows (raw competence + decay_at)
 */
export async function rederiveRollups(client, index, userId, touchedTrackKeys) {
  const rowCache = new Map(); // trackKey → Map(item_id → row)
  const rowsFor = async (key) => {
    if (!rowCache.has(key)) {
      const [vendorId, trackId] = key.split("/");
      rowCache.set(key, await loadTrackRows(client, userId, vendorId, trackId));
    }
    return rowCache.get(key);
  };

  const upserted = [];
  const touched = [...new Set(touchedTrackKeys)];

  // ── domain scopes for each touched, known track ─────────────────────
  for (const key of touched) {
    const entry = index.tracks.get(key);
    if (!entry) continue;
    const [vendorId, trackId] = key.split("/");
    const rows = await rowsFor(key);
    for (const [domainId, d] of entry.domains) {
      const itemIds = domainItemIds(d.data);
      const decayAtMs = latestAnswerMs(rows, itemIds);
      if (!decayAtMs) continue; // untouched domain → no row (absent = 0)
      const stats = domainStatsFromRows(d.data, rows);
      const row = {
        scopeType: "domain", vendorId, trackId, scopeId: domainId,
        competence: stats.mastery, decayAt: new Date(decayAtMs),
      };
      await client.query(UPSERT_MASTERY_SQL, [userId, vendorId, trackId, "domain", domainId, row.competence, row.decayAt]);
      upserted.push(row);
    }
  }

  // ── path scopes — every path that touches a touched track (D6) ──────
  const touchedSet = new Set(touched);
  for (const path of index.paths.data.paths || []) {
    const memberKeys = (path.tracks || []).map((t) => `${t.vendorId}/${t.trackId}`);
    if (!memberKeys.some((k) => touchedSet.has(k))) continue;

    // Weighted roll-up across EVERY domain the path touches — untouched
    // member domains count as 0, so a path is honest about unstudied tracks.
    const entries = [];
    let decayAtMs = 0;
    for (const key of memberKeys) {
      const entry = index.tracks.get(key);
      if (!entry) continue; // coming-soon member: no content to weigh yet
      const rows = await rowsFor(key);
      for (const [, d] of entry.domains) {
        const stats = domainStatsFromRows(d.data, rows);
        entries.push({ weight: stats.weight, competence: stats.mastery });
        const latest = latestAnswerMs(rows, domainItemIds(d.data));
        if (latest > decayAtMs) decayAtMs = latest;
      }
    }
    if (!decayAtMs || entries.length === 0) continue; // nothing studied in this path yet

    const row = {
      scopeType: "path", vendorId: null, trackId: null, scopeId: path.id,
      competence: weightedCompetence(entries), decayAt: new Date(decayAtMs),
    };
    await client.query(UPSERT_MASTERY_SQL, [userId, null, null, "path", path.id, row.competence, row.decayAt]);
    upserted.push(row);
  }

  return upserted;
}

/**
 * Blueprint weight for a mastery_map scope, for the decay half-life:
 * domain rows use their domain's weight; path rows (which span domains) use
 * the mean weight of their member domains — a first-cut stand-in until pilot
 * data says otherwise. Unknown content falls back to a neutral mid weight.
 */
export function scopeWeightResolver(index) {
  const pathWeights = new Map();
  for (const path of index.paths.data.paths || []) {
    const weights = [];
    for (const t of path.tracks || []) {
      const entry = index.tracks.get(`${t.vendorId}/${t.trackId}`);
      if (!entry) continue;
      for (const [, d] of entry.domains) weights.push(d.data.weight || 0);
    }
    if (weights.length) pathWeights.set(path.id, weights.reduce((a, b) => a + b, 0) / weights.length);
  }
  return function scopeWeight({ scopeType, vendorId, trackId, scopeId }) {
    if (scopeType === "path") return pathWeights.get(scopeId) ?? DEFAULT_SCOPE_WEIGHT;
    const entry = index.tracks.get(`${vendorId}/${trackId}`);
    const d = entry && entry.domains.get(scopeId);
    return d && typeof d.data.weight === "number" ? d.data.weight : DEFAULT_SCOPE_WEIGHT;
  };
}

/** Wire shape for a mastery row with decay applied on read (03 §2). */
export function masteryToWire(row, scopeWeight, nowMs) {
  const decayAtMs = row.decayAt instanceof Date ? row.decayAt.getTime() : new Date(row.decayAt).getTime();
  const effective = effectiveCompetence(row.competence, decayAtMs, nowMs, scopeWeight(row));
  return {
    scopeType: row.scopeType, vendorId: row.vendorId, trackId: row.trackId, scopeId: row.scopeId,
    competence: effective, competenceRaw: row.competence,
    decayAt: new Date(decayAtMs).toISOString(),
    ...(row.updatedAt ? { updatedAt: new Date(row.updatedAt).toISOString() } : {}),
  };
}
