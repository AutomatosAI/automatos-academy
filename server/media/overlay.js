// Serve-time media overlay (PRD-WAVE-CONTENT-OPS C3 PR2) — a bound slot renders
// PUBLISHED with its CDN url, beating the git placeholder, WITHOUT a republish.
// Pure + immutable: the served content index is shared and cached, so this
// returns a NEW track object and never mutates the source (a mutation would
// corrupt the cached index and leak across requests).
//
// Only videos[] carry slots today; audio/transcript bindings attach to
// lessons/episodes and are overlaid where those are served (later).

export function overlayTrackVideos(trackData, bySlot) {
  if (!bySlot || !Array.isArray(trackData.videos) || trackData.videos.length === 0) {
    return trackData;
  }
  let changed = false;
  const videos = trackData.videos.map((v) => {
    const b = bySlot.get(`${v.id}:video`);
    if (!b) return v;
    changed = true;
    return { ...v, url: b.url, status: "published", provider: v.provider || "file" };
  });
  return changed ? { ...trackData, videos } : trackData;
}
