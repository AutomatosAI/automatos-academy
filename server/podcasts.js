/**
 * Podcast manifest — versioned, published-only episode list (PRD-MT-10).
 *
 * The episode shape IS the app's client-side contract
 * (automatos-academy-app/src/podcast/schema.ts): id, title, vendorId, trackId,
 * durationSec, chapters[{id,title,startSec}], transcriptUrl?, audioUrl,
 * groundingLabel. The API serves it verbatim so the app consumes it with zero
 * adapters. Unknown fields pass through untouched (the app schema is
 * `.passthrough()` — an additive manifest change never breaks the client).
 *
 * Real episodes arrive later (owner: NotebookLM → media CDN, same lane as
 * videos — deploy-media.yml already syncs *.mp3). The seed manifest is
 * intentionally EMPTY and the app renders an honest empty state; nothing here
 * assumes a source beyond "JSON that parses".
 *
 * Pure module (fs + crypto only, no express): the boot-time index folds the
 * podcast hash into the catalog content-version + delta journal, and the
 * pre-merge validator reuses `collectEpisodeErrors` so both judge episodes by
 * ONE definition of the contract.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const shortHash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const isStr = (v) => typeof v === "string" && v.length > 0;

/**
 * Collect every contract violation for one episode (empty array = valid).
 * This is the single source of truth for schema.ts parity — required fields
 * present and correctly typed, chapters strictly ascending and inside the
 * duration (the seek math the player depends on). Unknown fields are ignored
 * (served verbatim), mirroring the app schema's passthrough posture.
 */
export function collectEpisodeErrors(ep, where) {
  if (!ep || typeof ep !== "object") return [`${where}: episode is not an object`];
  const errs = [];
  for (const f of ["id", "title", "vendorId", "trackId", "audioUrl", "groundingLabel"]) {
    if (!isStr(ep[f])) errs.push(`${where}: ${f} must be a non-empty string`);
  }
  if (typeof ep.durationSec !== "number" || !(ep.durationSec > 0)) {
    errs.push(`${where}: durationSec must be a positive number`);
  }
  if (ep.transcriptUrl !== undefined && !isStr(ep.transcriptUrl)) {
    errs.push(`${where}: transcriptUrl, when present, must be a non-empty string`);
  }
  if (ep.chapters !== undefined && !Array.isArray(ep.chapters)) {
    errs.push(`${where}: chapters must be an array`);
  } else {
    let prev = -Infinity;
    for (const [i, c] of (ep.chapters || []).entries()) {
      const cw = `${where}/chapter[${i}]`;
      if (!isStr(c?.id) || !isStr(c?.title)) errs.push(`${cw}: id and title are required`);
      if (typeof c?.startSec !== "number" || c.startSec < 0) { errs.push(`${cw}: startSec must be a number ≥ 0`); continue; }
      if (c.startSec <= prev) errs.push(`${cw}: startSec must be strictly ascending`);
      if (typeof ep.durationSec === "number" && c.startSec >= ep.durationSec) errs.push(`${cw}: startSec must sit inside the episode duration`);
      prev = c.startSec;
    }
  }
  return errs;
}

/**
 * Parse + validate a podcast manifest from its canonical text (the exact file
 * bytes). Shared by the file loader below and the Postgres loader
 * (server/catalog-db.js), so both content sources judge episodes — and hash
 * the manifest — by ONE definition. Returns:
 *   data     — the raw manifest ({version, episodes}), served verbatim
 *   hash     — content hash of the canonical text (folded into contentVersion)
 *   episodes — Map(episodeId → episode) for O(1) `/podcasts/:episodeId`
 *   scope    — {episodeId → per-episode hash} snapshot for episode-granular
 *              deltas in the changes journal (mirrors track/domain granularity)
 */
export function parsePodcastManifest(raw, where = "podcasts.json") {
  let data;
  try { data = JSON.parse(raw); }
  catch (e) { throw new Error(`[podcasts] invalid JSON in manifest at ${where}: ${e.message}`); }

  if (typeof data.version !== "number") throw new Error("[podcasts] manifest.version must be a number");
  const list = data.episodes ?? [];
  if (!Array.isArray(list)) throw new Error("[podcasts] manifest.episodes must be an array");

  const episodes = new Map();
  const scope = {}; // episodeId → hash, for episode-granular deltas
  for (const ep of list) {
    const errs = collectEpisodeErrors(ep, `episode ${ep?.id ?? "?"}`);
    if (errs.length) throw new Error(`[podcasts] ${errs.join("; ")}`);
    if (episodes.has(ep.id)) throw new Error(`[podcasts] duplicate episode id ${ep.id}`);
    episodes.set(ep.id, ep);
    scope[ep.id] = shortHash(JSON.stringify(ep));
  }
  return { data, hash: shortHash(raw), episodes, scope };
}

/**
 * Build the in-memory podcast index from public/content/podcasts.json.
 *
 * Fail loud on malformed content — the validator catches the same problems
 * pre-merge, so a boot failure here means an unvalidated deploy shipped, never
 * a user-facing 500. Returns everything parsePodcastManifest does, plus
 *   raw — the canonical file text (what publish-content stores and hashes).
 */
export function buildPodcastIndex(contentDir) {
  const path = join(contentDir, "podcasts.json");
  // Required — a deploy without it is a packaging bug, not a runtime 404.
  // (Seeded empty; episodes are added to it later.)
  if (!existsSync(path)) throw new Error(`[podcasts] manifest missing at ${path}`);
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) { throw new Error(`[podcasts] cannot read manifest at ${path}: ${e.message}`); }
  return { ...parsePodcastManifest(raw, path), raw };
}
