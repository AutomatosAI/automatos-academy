// Vendor-agnostic content loader. The engine knows nothing about any vendor;
// it loads whatever vendors/tracks the manifest declares and assembles a
// typed tree (vendor → track → domain → lesson/question/scenario/lab/...).
//
// PRD-U3 S6: content comes from the Content API (/api/catalog — the same
// contract the mobile app consumes) instead of static /content/*.json. The
// assembled shapes are identical (the API serves the files verbatim), so this
// module is the only one that changes. Plain fetch() — no cache:"no-cache" —
// lets the browser honour the API's ETag/max-age=300 with native conditional
// GETs.

const cache = new Map();

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

export async function loadCatalog() {
  if (cache.has("catalog")) return cache.get("catalog");
  const m = await getJSON("/api/catalog");
  cache.set("catalog", m);
  return m;
}

export async function loadTrack(vendorId, trackId) {
  const key = `t:${vendorId}/${trackId}`;
  if (cache.has(key)) return cache.get(key);
  const base = `/api/catalog/${encodeURIComponent(vendorId)}/${encodeURIComponent(trackId)}`;
  const track = await getJSON(base);
  const domains = [];
  for (const df of track.domainFiles || []) {
    // The API keys domains by the file's `id`; filename stem === id is the
    // tree-wide invariant the mobile client already relies on
    // (automatos-academy-app/src/cache/content.ts strips .json the same way).
    const domainId = df.replace(/\.json$/, "");
    try { domains.push(await getJSON(`${base}/${encodeURIComponent(domainId)}`)); }
    catch (e) { console.warn(`[content] domain failed: ${df}`, e.message); }
  }
  domains.sort((a, b) => (a.order || 0) - (b.order || 0));
  const full = { vendorId, trackId, ...track, domains };

  // Light validation — surface authoring mistakes without crashing the app.
  // Skills tracks (no exam) carry no blueprint weights, so only exam tracks
  // are held to the sum-to-1.0 rule here (same rule as the validator).
  const sum = domains.reduce((s, d) => s + (d.weight || 0), 0);
  const isExamTrack = !!(track.exam && track.exam.questionCount);
  if (isExamTrack && domains.length && Math.abs(sum - 1) > 0.02) {
    console.warn(`[content] ${trackId} domain weights sum to ${sum.toFixed(3)} (expected 1.000)`);
  }
  cache.set(key, full);
  return full;
}

// ── selectors ──────────────────────────────────────────────────────────
export const domainById = (track, id) => track.domains.find((d) => d.id === id);

export const lessonById = (track, domainId, lessonId) => {
  const d = domainById(track, domainId);
  return d && (d.lessons || []).find((l) => l.id === lessonId);
};

export const allQuestions = (track) =>
  track.domains.flatMap((d) => (d.questions || []).map((q) => ({ ...q, domainId: d.id })));

export const allScenarios = (track) =>
  track.domains.flatMap((d) => (d.scenarios || []).map((s) => ({ ...s, domainId: d.id, domainName: d.name })));

export const scenarioById = (track, id) => allScenarios(track).find((s) => s.id === id) || null;

export const allResources = (track) => {
  const fromDomains = track.domains.flatMap((d) => (d.resources || []).map((r) => ({ ...r, domainName: d.name })));
  const official = (track.officialResources || []).map((r) => ({ ...r, official: true }));
  return [...official, ...fromDomains];
};

export const allVideos = (track) =>
  track.domains.flatMap((d) => (d.videos || []).map((v) => ({ ...v, domainName: d.name, domainId: d.id })));

export const allLabs = (track) =>
  track.domains.flatMap((d) => (d.labs || []).map((l) => ({ ...l, domainName: d.name, domainId: d.id })));

export const lessonCount = (track) => track.domains.reduce((n, d) => n + (d.lessons || []).length, 0);

export const domainLessonCount = (d) => (d.lessons || []).length;
