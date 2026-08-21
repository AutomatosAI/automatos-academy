// PRD-WAVE-LEARNER-UX LX-1/LX-2 — the one ✓ language for media.
//
// wireMediaEl() is the player→store path (D-LX1: `ended` OR ≥90% position,
// whichever first; fires once, never un-completes). doneChip()/markToggle()
// are the shared visuals, used by the video hub, the lesson Listen player and
// (later) anywhere else media is listed — one look, everywhere.

import { el } from "./ui.js";

/** Auto-complete a <video>/<audio> element per D-LX1. Safe to call on any
 *  media element; does nothing until playback actually reaches the bar. */
export function wireMediaEl(mediaEl, store, kind, mediaId) {
  if (!mediaEl || !store || !mediaId) return;
  let fired = false;
  const complete = () => {
    if (fired) return;
    fired = true;
    store.mediaAuto(kind, mediaId);
    mediaEl.dispatchEvent(new CustomEvent("lx-media-complete", { bubbles: true }));
  };
  mediaEl.addEventListener("ended", complete);
  mediaEl.addEventListener("timeupdate", () => {
    const d = mediaEl.duration;
    if (d && Number.isFinite(d) && d > 0 && mediaEl.currentTime / d >= 0.9) complete();
  });
}

/** the ✓ chip — render when done; caller decides placement */
export function doneChip(label = "Watched") {
  return el("span", { class: "media-done-chip", "aria-label": label }, ["✓ ", label]);
}

/**
 * The manual override, both directions (LX-1). Renders as a quiet text
 * button; re-renders itself on toggle and on the player's auto-complete
 * event (listen on a parent for `lx-media-complete`).
 */
export function markToggle(store, kind, mediaId, { doneLabel = "Watched", markLabel = "Mark watched", unmarkLabel = "Mark unwatched", onChange } = {}) {
  const wrap = el("span", { class: "media-mark" });
  const render = () => {
    wrap.textContent = "";
    const done = store.mediaDone(mediaId);
    if (done) wrap.appendChild(doneChip(doneLabel));
    const btn = el("button", {
      type: "button",
      class: "media-mark-btn",
      "aria-pressed": done ? "true" : "false",
      text: done ? unmarkLabel : markLabel,
    });
    btn.addEventListener("click", () => {
      store.markMedia(kind, mediaId, !done, "manual");
      render();
      if (onChange) onChange(!done);
    });
    wrap.appendChild(btn);
  };
  render();
  // the player's auto-complete refreshes the control without a re-render
  wrap.refresh = render;
  return wrap;
}
