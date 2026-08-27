// The podcast library — the web's first podcast surface.
//
// Ten produced episodes have been reachable only from the mobile app, while
// the web hero has been counting them for every visitor with nowhere to send
// them (PRD-MT-10 scoped podcasts as the app's contract; LX-2 recorded "no
// web podcast player exists" and left podcast ✓ app-side). This closes that.
//
// Two things this page must get exactly right:
//
// 1. The media id is the RAW episode id, matching app/(tabs)/podcast/[episode].tsx
//    (`applyMark(map, 'podcast', episode.id, …)`). Videos key on the video id
//    and narrations on `a-<lessonId>`, so a `p-` prefix would have looked
//    tidier here — and would have made the same episode read "listened" on the
//    phone and "not listened" on the web. One ✓ language means one id.
//
// 2. Completion is stored per track, because Store is per track and the app
//    scopes its media map by (vendorId, trackId) too. This page is
//    cross-track, so it holds one Store per track it renders rather than
//    inventing a global one.
import { el, clear } from "../ui.js";
import { section } from "./_chrome.js";
import { url, setTitle } from "../router.js";
import { loadCatalog, loadPodcasts } from "../content.js";
import { Store } from "../store.js";
import { wireMediaEl, markToggle, doneChip } from "../media-progress.js";
import { track as tkEvent } from "../analytics.js";

/** 2546 → "42 min"; short things keep their seconds. */
function duration(sec) {
  const s = Number(sec) || 0;
  if (!s) return "";
  const m = Math.round(s / 60);
  return m >= 1 ? `${m} min` : `${s} sec`;
}

/** vendorId/trackId → display name, from the catalog manifest. */
function trackNames(catalog) {
  const names = new Map();
  for (const v of (catalog && catalog.vendors) || []) {
    for (const t of v.tracks || []) names.set(`${v.id}/${t.trackId}`, t.name || t.trackId);
  }
  return names;
}

function episodeCard(ep, store, onChange) {
  const audio = el("audio", {
    controls: true,
    preload: "none",
    src: ep.audioUrl,
    style: { width: "100%", display: "block", marginTop: "12px" },
    "aria-label": `Listen to ${ep.title}`,
  });
  // Same ✓ language as videos and narrations: 90% or "ended" marks it, the
  // manual toggle sits beside the player, and a rewatch never un-completes.
  wireMediaEl(audio, store, "podcast", ep.id);
  const mark = markToggle(store, "podcast", ep.id, {
    doneLabel: "Listened",
    markLabel: "Mark listened",
    unmarkLabel: "Mark unlistened",
    onChange,
  });
  audio.addEventListener("lx-media-complete", () => {
    if (mark.refresh) mark.refresh();
    onChange && onChange();
  });

  const card = el("div", { class: "pod-card", "data-done": store.mediaDone(ep.id) ? "true" : "false" }, [
    el("div", { class: "pod-head" }, [
      el("h3", { class: "pod-title", text: ep.title }),
      store.mediaDone(ep.id) ? doneChip("Listened") : null,
    ]),
    el("p", { class: "mono-label pod-meta", text: [duration(ep.durationSec), ep.chapters && ep.chapters.length ? `${ep.chapters.length} chapters` : null].filter(Boolean).join(" · ") }),
    audio,
    el("div", { class: "pod-actions" }, [
      mark,
      el("a", { class: "mono-label pod-track-link", href: url.track(ep.vendorId, ep.trackId), text: "Open the course →" }),
    ]),
    // The grounding label travels with the episode from the manifest — it is
    // the same honesty posture the Wire's transparency label carries: say how
    // this was made, on the surface where it is consumed.
    ep.groundingLabel ? el("p", { class: "pod-grounding", text: ep.groundingLabel }) : null,
  ]);
  return card;
}

export function podcastsView() {
  setTitle("Podcasts");
  const root = el("div", {});
  const body = el("div", {});
  const summary = el("p", { class: "lede muted", style: { maxWidth: "64ch", marginTop: "14px" } });

  root.appendChild(section(
    el("h1", { style: { fontFamily: "var(--display)", fontSize: "clamp(30px,4.4vw,48px)" }, text: "Podcasts" }),
    summary,
    body,
  ));

  summary.textContent = "Loading episodes…";

  Promise.all([loadPodcasts(), loadCatalog()])
    .then(([manifest, catalog]) => {
      const episodes = (manifest && manifest.episodes) || (Array.isArray(manifest) ? manifest : []);
      if (!episodes.length) {
        summary.textContent = "No episodes are published yet.";
        return;
      }
      const names = trackNames(catalog);
      // One Store per track — the app scopes its media map the same way, so a
      // podcast finished on the phone is already ✓ here once the Spine syncs.
      const stores = new Map();
      const storeFor = (ep) => {
        const key = `${ep.vendorId}/${ep.trackId}`;
        if (!stores.has(key)) stores.set(key, new Store(ep.vendorId, ep.trackId));
        return stores.get(key);
      };

      const listened = () => episodes.filter((e) => storeFor(e).mediaDone(e.id)).length;
      const paint = () => {
        const n = listened();
        summary.textContent = n
          ? `${n} of ${episodes.length} listened. Deep dives produced with NotebookLM — each one grounded in the course it belongs to.`
          : `${episodes.length} episodes, produced with NotebookLM — each one grounded in the course it belongs to. Listen anywhere; your progress is remembered on this device and syncs when you sign in.`;
      };
      paint();

      // Grouped by course, in catalog order, so the library reads like the
      // curriculum rather than an upload log.
      const groups = new Map();
      for (const ep of episodes) {
        const key = `${ep.vendorId}/${ep.trackId}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(ep);
      }
      clear(body);
      for (const [key, eps] of groups) {
        body.appendChild(el("h2", { class: "serif-i pod-group", text: names.get(key) || key }));
        body.appendChild(el("div", { class: "pod-grid" }, eps.map((ep) => {
          const store = storeFor(ep);
          const card = episodeCard(ep, store, () => {
            paint();
            card.setAttribute("data-done", store.mediaDone(ep.id) ? "true" : "false");
          });
          return card;
        })));
      }
      tkEvent("page_view", { path: "/podcasts", episodes: episodes.length });
    })
    .catch(() => {
      summary.textContent = "The episode list couldn't be loaded. Refresh to try again.";
    });

  return root;
}
