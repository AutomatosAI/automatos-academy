// Ingest-boundary validation (PRD-WIRE §4.3) — the verification gate. The
// API cannot check truth; it enforces the SHAPE of verification, so an
// unverified post cannot be accepted no matter what the pipeline upstream
// did. Anything failing these rules is a 400 — the post never exists, not
// even as a draft. Pure functions, unit-testable without Postgres (same
// posture as server/spine/validate.js).
//
// Every error is `{ field, reason }` — routes wrap it as
// `400 {error:"invalid_input", field, reason}` so the mission can see exactly
// which rule it tripped.

export const WIRE_TYPES = ["model-news", "trend", "new-course", "question-refresh", "changelog"];
// Factual types report the outside world → ≥2 sources on distinct registrable
// domains (independence, not two pages of the same site). First-party types
// report our own artifacts → ≥1 source (the canonical artifact — the track
// page, the merged PR URL; WHICH artifact is the S4 contract's rule, not
// checkable shape).
export const FACTUAL_TYPES = ["model-news", "trend"];

// §4.1 caps, enforced here AND as CHECKs in the migration (defense in depth).
export const MAX_POST_ID = 200;
export const MAX_SLUG = 80;
export const MAX_TAGS = 8;
export const MAX_TAG_LEN = 40;
export const MAX_TITLE = 120;
export const MAX_SUMMARY = 300;
export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_SOURCES = 12;
export const MAX_CLAIMS = 200;
export const MAX_SOURCE_TITLE = 200;
export const MAX_SOURCE_AGE_MS = 7 * 24 * 3_600_000; // §4.3: no stale research
export const MAX_FUTURE_SKEW_MS = 10 * 60_000;       // retrievedAt clock tolerance
export const MAX_AGENTS = 8;
export const MAX_REASON = 500;
export const MAX_NOTE = 500;

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isStr = (v, max, min = 1) => typeof v === "string" && v.length >= min && v.length <= max;
const err = (field, reason) => ({ error: { field, reason } });

/**
 * Registrable-domain heuristic for source independence — eTLD+1 without a
 * public-suffix list dependency: last two labels, or last three when the TLD
 * is a 2-letter ccTLD behind a common second-level label (bbc.co.uk and
 * guardian.co.uk must NOT collapse to "co.uk"). Subdomains and "www." never
 * count as independence. Returns null for anything that isn't http(s).
 */
const CC_SECOND_LEVEL = new Set(["co", "com", "net", "org", "gov", "ac", "edu", "mil"]);
export function registrableDomain(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch (_) { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const labels = u.hostname.toLowerCase().split(".").filter(Boolean);
  if (labels.length < 2) return null;
  const take = labels.length > 2 && labels[labels.length - 1].length === 2 && CC_SECOND_LEVEL.has(labels[labels.length - 2]) ? 3 : 2;
  return labels.slice(-take).join(".");
}

/** One source entry: {url, title, retrievedAt, claims} — nothing else. */
function validateSource(s, i, nowMs) {
  const at = (f) => `sources[${i}].${f}`;
  if (!s || typeof s !== "object" || Array.isArray(s)) return err(`sources[${i}]`, "not_an_object");
  for (const k of Object.keys(s)) {
    if (!["url", "title", "retrievedAt", "claims"].includes(k)) return err(at(k), "unknown_field");
  }
  const domain = typeof s.url === "string" ? registrableDomain(s.url) : null;
  if (!domain) return err(at("url"), "must_be_http_or_https_url");
  if (!isStr(s.title, MAX_SOURCE_TITLE)) return err(at("title"), `must_be_string_1_to_${MAX_SOURCE_TITLE}_chars`);
  const t = typeof s.retrievedAt === "string" ? Date.parse(s.retrievedAt) : NaN;
  if (Number.isNaN(t)) return err(at("retrievedAt"), "must_be_iso_timestamp");
  if (nowMs - t > MAX_SOURCE_AGE_MS) return err(at("retrievedAt"), "stale_over_7_days");
  if (t - nowMs > MAX_FUTURE_SKEW_MS) return err(at("retrievedAt"), "in_the_future");
  if (!isStr(s.claims, MAX_CLAIMS) || /[\r\n]/.test(s.claims)) return err(at("claims"), `must_be_one_line_1_to_${MAX_CLAIMS}_chars`);
  return { value: { url: s.url, title: s.title, retrievedAt: s.retrievedAt, claims: s.claims }, domain };
}

/** byline: {agents[], missionRun, model?} — feeds the transparency label. */
function validateByline(b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return err("byline", "not_an_object");
  for (const k of Object.keys(b)) {
    if (!["agents", "missionRun", "model"].includes(k)) return err(`byline.${k}`, "unknown_field");
  }
  if (!Array.isArray(b.agents) || b.agents.length < 1 || b.agents.length > MAX_AGENTS) {
    return err("byline.agents", `must_be_array_of_1_to_${MAX_AGENTS}`);
  }
  for (const a of b.agents) if (!isStr(a, 80)) return err("byline.agents", "each_agent_must_be_string_1_to_80_chars");
  if (!isStr(b.missionRun, 200)) return err("byline.missionRun", "must_be_string_1_to_200_chars");
  if (b.model !== undefined && !isStr(b.model, 80)) return err("byline.model", "must_be_string_1_to_80_chars");
  const value = { agents: b.agents, missionRun: b.missionRun };
  if (b.model !== undefined) value.model = b.model;
  return { value };
}

const INGEST_FIELDS = ["postId", "slug", "type", "tags", "title", "summary", "bodyMd", "sources", "byline", "status"];

/**
 * Validate a whole POST /api/wire/posts body against §4.1 caps + the §4.3
 * verification gate + the D-W1 publish policy. Returns
 * `{ error: {field, reason} }` on the first failure, else `{ value }` with a
 * normalized post (status defaulted to 'draft').
 *
 * @param {object} body — parsed JSON body
 * @param {{nowMs: number, publishPolicy: "review"|"auto"}} opts
 */
export function validateIngest(body, { nowMs, publishPolicy }) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return err("body", "not_an_object");
  for (const k of Object.keys(body)) {
    if (!INGEST_FIELDS.includes(k)) return err(k, "unknown_field");
  }

  if (!isStr(body.postId, MAX_POST_ID)) return err("postId", `must_be_string_1_to_${MAX_POST_ID}_chars`);
  if (!isStr(body.slug, MAX_SLUG) || !SLUG_RE.test(body.slug)) return err("slug", "must_match_^[a-z0-9]+(-[a-z0-9]+)*$_max_80");
  if (!WIRE_TYPES.includes(body.type)) return err("type", `must_be_one_of_${WIRE_TYPES.join("|")}`);

  const tags = body.tags === undefined ? [] : body.tags;
  if (!Array.isArray(tags) || tags.length > MAX_TAGS) return err("tags", `must_be_array_of_at_most_${MAX_TAGS}`);
  for (const t of tags) if (!isStr(t, MAX_TAG_LEN)) return err("tags", `each_tag_must_be_string_1_to_${MAX_TAG_LEN}_chars`);

  if (!isStr(body.title, MAX_TITLE)) return err("title", `must_be_string_1_to_${MAX_TITLE}_chars`);
  if (!isStr(body.summary, MAX_SUMMARY)) return err("summary", `must_be_string_1_to_${MAX_SUMMARY}_chars`);
  if (typeof body.bodyMd !== "string" || body.bodyMd.length === 0 || Buffer.byteLength(body.bodyMd, "utf8") > MAX_BODY_BYTES) {
    return err("bodyMd", `must_be_string_1_byte_to_${MAX_BODY_BYTES}_bytes`);
  }

  // ── the verification gate (§4.3) ─────────────────────────────────────
  if (!Array.isArray(body.sources) || body.sources.length < 1 || body.sources.length > MAX_SOURCES) {
    return err("sources", `must_be_array_of_1_to_${MAX_SOURCES}`);
  }
  const sources = [];
  const domains = new Set();
  for (let i = 0; i < body.sources.length; i++) {
    const r = validateSource(body.sources[i], i, nowMs);
    if (r.error) return r;
    sources.push(r.value);
    domains.add(r.domain);
  }
  if (FACTUAL_TYPES.includes(body.type) && domains.size < 2) {
    return err("sources", "factual_type_needs_2_sources_on_independent_domains");
  }

  const byline = validateByline(body.byline);
  if (byline.error) return byline;

  const status = body.status === undefined ? "draft" : body.status;
  if (status !== "draft" && status !== "published") return err("status", "must_be_draft_or_published");
  if (status === "published" && publishPolicy !== "auto") {
    return err("status", "publish_policy_is_review_use_the_publish_call");
  }

  return {
    value: {
      postId: body.postId, slug: body.slug, type: body.type, tags,
      title: body.title, summary: body.summary, bodyMd: body.bodyMd,
      sources, byline: byline.value, status,
    },
  };
}
