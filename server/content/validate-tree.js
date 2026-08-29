// The ONE definition of content validity, as a pure library (PRD-FACTORY-GATE
// US-001, FR-1).
//
// These checks lived in scripts/validate-content.mjs, welded to disk reads and
// module-level errors[]/warnings[] arrays. That was fine while the only thing
// that validated content was the git lane — but the draft plane approves
// content where no disk tree exists, and approval was checking nothing
// semantic (the R1 gap: an agent draft with dead links, markdown leaks or
// unanswerable questions sailed through a status flip the git lane would have
// rejected). One library, two callers: the CLI wraps it around a disk walk,
// the approve path wraps it around the effective in-memory tree.
//
// Contract:
//   validateContentTree(documents, { assetExists }) → { errors, warnings, info }
//
//   documents    Map/object of relPath → parsed JSON, the same vocabulary the
//                content index and the draft plane speak: "manifest.json",
//                "paths.json", "levels.json", "podcasts.json",
//                "<vendor>/<track>/track.json", "<vendor>/<track>/<domainFile>".
//                Values are PARSED objects — a caller that reads text (the CLI,
//                the draft plane's canonical column) owns parse errors and
//                their messages; this library never sees invalid JSON.
//   assetExists  (rootRelativePath) → boolean. The one genuine disk question:
//                a root-relative url ("/og-academy.png") must point at a real
//                file under public/. Injected so the library stays pure; both
//                callers back it with the same public/ directory today.
//   info         The progress lines the CLI has always printed (per-domain ✓,
//                per-track summaries), collected in order so the wrapper can
//                reproduce its output byte-for-byte. Server callers ignore it.
//
// Error strings are the CLI's, verbatim — CI gates on that output, and an
// agent fixing a rejected draft should read the same message a human reads in
// a red PR check.
import { collectEpisodeErrors } from "../podcasts.js";
import { validateCards } from "../cards/types.js";
import { cardsFromDomain } from "../cards/map.js";

const TRACK_KEY_RX = /^([^/]+)\/([^/]+)\/track\.json$/;

/**
 * PRD-WAVE-LEARNER-UX LX-6 — markdown belongs only where markdown renders.
 * Overviews/summaries render through mdInline() and MAY carry tokens; short
 * display fields (titles, names, labels) never render markdown anywhere.
 */
const MD_TOKEN = /(\*\*[^*]+\*\*|(^|[^*\w])\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/;

export function validateContentTree(documents, { assetExists = () => false } = {}) {
  const docs = documents instanceof Map ? documents : new Map(Object.entries(documents || {}));
  const errors = [];
  const warnings = [];
  const info = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const log = (m) => info.push(m);

  /**
   * Every `url` a learner can click must be REACHABLE from a browser — the
   * 2026-07-30 bug: repo-relative "sources" rendered as dead links that
   * silently landed on the home page (211 across 39 files). Allowed: absolute
   * http(s), or a root-relative path that exists under public/ (assetExists).
   * Empty/null are legal: unproduced video slots carry url: "".
   */
  const validateUrl = (value, where) => {
    if (value === undefined || value === null || value === "") return;
    if (typeof value !== "string") return err(`${where}: url must be a string`);
    if (/^https?:\/\//i.test(value)) return;
    if (value.startsWith("/")) {
      const rel = value.replace(/^\//, "").replace(/[?#].*$/, "");
      if (!assetExists(rel)) err(`${where}: root-relative url "${value}" has no file at public${value}`);
      return;
    }
    err(`${where}: url "${value}" is not reachable from a browser — repo paths render as dead links that silently land on the home page. Use the published URL (docs.automatos.app/… or github.com/AutomatosAI/…).`);
  };

  /** walk any content object and validate every `url` it carries, at any depth */
  const validateUrlsDeep = (node, where) => {
    if (Array.isArray(node)) return node.forEach((n, i) => validateUrlsDeep(n, `${where}[${i}]`));
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (k === "url") validateUrl(v, `${where}${node.id ? `/${node.id}` : ""}`);
      else validateUrlsDeep(v, where);
    }
  };

  const validateQuestion = (q, where, ids) => {
    if (!q.id) return err(`${where}: question missing id`);
    if (ids.has(q.id)) err(`${where}: duplicate question id ${q.id}`); else ids.add(q.id);
    if (!q.stem) err(`${q.id}: missing stem`);
    if (!q.explanation) err(`${q.id}: missing explanation`);
    if (!Array.isArray(q.options) || q.options.length < 2) return err(`${q.id}: needs ≥2 options`);
    const correct = q.options.filter((o) => o.correct).length;
    if (correct < 1) err(`${q.id}: no correct option`);
    if (q.type === "multi" ? correct < 2 : correct !== 1) warn(`${q.id}: ${correct} correct for type=${q.type || "single"}`);
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length) err(`${q.id}: duplicate option ids`);
  };

  const checkPlainField = (value, where) => {
    if (typeof value === "string" && MD_TOKEN.test(value)) {
      err(`${where}: markdown token in a plain-text field — this renders as literal asterisks/backticks: ${JSON.stringify(value.slice(0, 80))}`);
    }
  };
  const checkPlainFieldsDeep = (node, where) => {
    if (Array.isArray(node)) { node.forEach((v, i) => checkPlainFieldsDeep(v, `${where}[${i}]`)); return; }
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && /^(title|name|label|code|cap|caption)$/.test(k)) checkPlainField(v, `${where}.${k}`);
      else if (typeof v === "object" && v) checkPlainFieldsDeep(v, `${where}.${k}`);
    }
  };

  // ── Tracks: discovered from the map exactly as the CLI discovered them on
  // disk (every <vendor>/<track>/track.json, manifest-listed or not). Map
  // insertion order IS the iteration order — the caller owns sequencing, so
  // the CLI's disk-walk order reproduces byte-identically. ─────────────────
  const trackKeys = [...docs.keys()].filter((k) => TRACK_KEY_RX.test(k));
  for (const key of trackKeys) {
    const [, vendor, track] = key.match(TRACK_KEY_RX);
    const label = `${vendor}/${track}`;
    const t = docs.get(key);
    validateUrlsDeep(t, `${label}/track.json`);
    checkPlainFieldsDeep(t, `${label}/track.json`);
    // Two shapes: exam tracks (weighted blueprint, mock, A+ gate) and skills
    // tracks (no exam{} — APA/ABF/AI-Security shape; weights optional).
    const isExam = !!(t.exam && t.exam.questionCount);
    if (t.exam && !t.exam.questionCount) err(`${label}: exam{} present but questionCount missing — either complete it or drop exam{} (skills track)`);
    if (!isExam) log(`${label}: skills track (no exam — weights optional, no readiness gate)`);
    // Non-1000 scales (e.g. AIGP's 100–500) must state their A+ margin bar
    // explicitly — the historic 800 default only makes sense on a 1000 scale.
    if (isExam && t.exam.scoreScale && t.exam.scoreScale !== 1000 && !t.exam.aPlusScore) {
      warn(`${label}: scoreScale ${t.exam.scoreScale} without exam.aPlusScore — set the A+ margin bar explicitly`);
    }
    if (isExam && t.exam.aPlusScore && !(t.exam.aPlusScore > t.exam.passingScore && t.exam.aPlusScore <= (t.exam.scoreScale || 1000))) {
      err(`${label}: exam.aPlusScore ${t.exam.aPlusScore} must sit between passingScore and scoreScale`);
    }

    const ids = new Set();
    const cardIds = new Set(); // LA-1 — card uids are unique per track
    let weightSum = 0, domainCount = 0, weighted = 0, cardCount = 0;
    for (const df of t.domainFiles || []) {
      const d = docs.get(`${vendor}/${track}/${df}`);
      if (d === undefined) { err(`${label}: missing domain file ${df}`); continue; }
      validateUrlsDeep(d, `${label}/${df}`);
      checkPlainFieldsDeep(d, `${label}/${df}`);
      domainCount++;
      weightSum += d.weight || 0;
      if (typeof d.weight === "number") weighted++;
      if (isExam && typeof d.weight !== "number") err(`${label}/${df}: weight missing/not a number (exam tracks are blueprint-weighted)`);
      for (const l of d.lessons || []) {
        if (!l.body) warn(`${d.id}/${l.id}: empty lesson body`);
        for (const kc of l.knowledgeCheck || []) {
          if (kc.domainId !== d.id) err(`${kc.id}: domainId ${kc.domainId} ≠ ${d.id}`);
          validateQuestion(kc, `${df}`, ids);
        }
      }
      for (const q of d.questions || []) {
        if (q.domainId !== d.id) err(`${q.id}: domainId ${q.domainId} ≠ ${d.id}`);
        validateQuestion(q, `${df}`, ids);
      }
      for (const s of d.scenarios || []) {
        for (const st of s.steps || []) {
          if (!(st.choices || []).some((c) => c.verdict === "best")) err(`${s.id}/${st.id}: no 'best' choice`);
        }
      }
      // LA-1 — the whole domain must project cleanly into the typed feed
      // (cardsFromDomain validates any authored cards[] on the way through).
      // Cards are served by /api/catalog/cards, so a malformed card is a
      // gate-time error here, never a serve-time surprise.
      const projected = cardsFromDomain(d, { vendorId: vendor, trackId: track, domainId: d.id });
      projected.errors.forEach(err);
      for (const c of projected.cards) {
        if (cardIds.has(c.uid)) err(`${df}: duplicate card uid ${c.uid}`); else cardIds.add(c.uid);
      }
      cardCount += projected.cards.length;
      log(`  ✓ ${d.code || df} — ${(d.lessons || []).length} lessons, ${(d.questions || []).length} q, ${(d.scenarios || []).length} scn, ${projected.cards.length} cards, weight ${d.weight}`);
    }
    // Track-scope cards (LA-11's changelog seam) — same contract, no derivation.
    {
      const r = validateCards(t.cards, { scope: { vendorId: vendor, trackId: track }, where: `${label}: track cards` });
      r.errors.forEach(err);
      for (const c of r.cards) {
        if (cardIds.has(c.uid)) err(`${label}: duplicate card uid ${c.uid}`); else cardIds.add(c.uid);
      }
      cardCount += r.cards.length;
    }
    if (cardCount) log(`${label}: ${cardCount} feed cards`);
    // Exam tracks must sum to 1.000. A skills track may omit weights entirely;
    // if it declares any, they must still sum (half-weighted = authoring bug).
    if ((isExam || weighted > 0) && domainCount && Math.abs(weightSum - 1) > 0.005) err(`${label}: domain weights sum to ${weightSum.toFixed(3)}, expected 1.000`);
    log(`${label}: ${domainCount} domains${isExam || weighted ? `, weight sum ${weightSum.toFixed(3)}` : ""}`);
  }

  // ── Paths & levels (D6 content objects — CONTENT-API-CONTRACT.md §3) ──
  // Both files are required: the Content API serves them, and the mobile
  // chooser + `path` mastery scope have no source data without them.
  {
    const manifest = docs.has("manifest.json") ? docs.get("manifest.json") : null;
    if (!manifest) err("manifest.json missing");
    const manifestTracks = new Map(); // "vendor/track" → {lane, status}
    for (const v of manifest?.vendors || []) for (const t of v.tracks || []) {
      manifestTracks.set(`${v.id}/${t.trackId}`, { lane: t.lane, status: t.status });
    }
    const refKey = (r) => `${r?.vendorId}/${r?.trackId}`;
    const validRef = (r, where) => {
      if (!r || typeof r.vendorId !== "string" || typeof r.trackId !== "string") { err(`${where}: malformed track ref ${JSON.stringify(r)}`); return false; }
      if (!manifestTracks.has(refKey(r))) { err(`${where}: track ref ${refKey(r)} not in manifest`); return false; }
      return true;
    };

    const paths = docs.has("paths.json") ? docs.get("paths.json") : null;
    if (!paths) err("paths.json missing (D6 — required by the Content API)");
    const levels = docs.has("levels.json") ? docs.get("levels.json") : null;
    if (!levels) err("levels.json missing (D6 — required by the Content API)");

    if (paths) {
      const ids = new Set();
      for (const p of paths.paths || []) {
        const where = `paths/${p.id || "?"}`;
        if (!p.id || !p.name) err(`${where}: id and name required`);
        if (ids.has(p.id)) err(`${where}: duplicate path id`); else ids.add(p.id);
        if (!Array.isArray(p.tracks) || !p.tracks.length) { err(`${where}: needs ≥1 ordered track ref`); continue; }
        const resolved = p.tracks.filter((r) => validRef(r, where));
        if (resolved.length && !resolved.some((r) => manifestTracks.get(refKey(r)).status === "live")) {
          err(`${where}: every track is unpublished — a path may not be all coming-soon`);
        }
      }
      if (!(paths.paths || []).length) err("paths.json: empty paths[]");
      else log(`paths: ${(paths.paths || []).length} learning paths`);
    }

    if (levels) {
      const ids = new Set(), orders = new Set(), covered = new Map(); // "vendor/track" → levelId
      for (const l of levels.levels || []) {
        const where = `levels/${l.id || "?"}`;
        if (!l.id || !l.name || typeof l.order !== "number") err(`${where}: id, name, numeric order required`);
        if (ids.has(l.id)) err(`${where}: duplicate level id`); else ids.add(l.id);
        if (orders.has(l.order)) err(`${where}: duplicate order ${l.order}`); else orders.add(l.order);
        for (const r of l.tracks || []) {
          if (!validRef(r, where)) continue;
          const key = refKey(r);
          if (covered.has(key)) err(`${where}: ${key} already in level ${covered.get(key)} — a track appears in exactly one level`);
          covered.set(key, l.id);
          const lane = manifestTracks.get(key).lane;
          if (lane && lane !== l.id) err(`${where}: ${key} has manifest lane "${lane}" but sits in level "${l.id}" — levels are lanes promoted to objects, they must agree`);
        }
      }
      for (const [key, meta] of manifestTracks) {
        if (meta.status === "live" && !covered.has(key)) err(`levels: live track ${key} not assigned to any level`);
      }
      if (!(levels.levels || []).length) err("levels.json: empty levels[]");
      else log(`levels: ${(levels.levels || []).length} levels, ${covered.size} tracks assigned`);
    }

    // ── Podcasts (PRD-MT-10 — CONTENT-API-CONTRACT.md §8) ──────────────────
    // Episode shape is the app's client contract (schema.ts); collectEpisodeErrors
    // (server/podcasts.js) is the ONE shared judge the boot index uses too, so a
    // malformed manifest fails the gate here, not the deploy. Every episode's
    // (vendorId, trackId) must resolve to a real manifest track — no dangling audio.
    const pod = docs.has("podcasts.json") ? docs.get("podcasts.json") : null;
    if (!pod) err("podcasts.json missing (PRD-MT-10 — required by the Content API)");
    else {
      if (typeof pod.version !== "number") err("podcasts.json: version must be a number");
      if (!Array.isArray(pod.episodes)) err("podcasts.json: episodes must be an array");
      const epIds = new Set();
      for (const ep of pod.episodes || []) {
        const where = `podcasts/${ep?.id || "?"}`;
        for (const m of collectEpisodeErrors(ep, where)) err(m);
        if (ep?.id) { if (epIds.has(ep.id)) err(`${where}: duplicate episode id`); else epIds.add(ep.id); }
        validRef({ vendorId: ep?.vendorId, trackId: ep?.trackId }, where);
      }
      const n = (pod.episodes || []).length;
      log(`podcasts: ${n} episode${n === 1 ? "" : "s"}`);
    }
  }

  return { errors, warnings, info };
}
