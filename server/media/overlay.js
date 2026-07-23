// Serve-time media overlay (PRD-WAVE-CONTENT-OPS C3 PR2; domain slots: PRD-MEDIA-DOMAIN-SLOTS).
// A bound slot renders PUBLISHED with its CDN url, beating the git placeholder,
// WITHOUT a republish. Pure + immutable: the served content index is shared and
// cached, so this returns a NEW object and never mutates the source (a mutation
// would corrupt the cached index and leak across requests).
//
// Works on ANY node carrying a `videos[]` array — the track scope (track.json)
// AND each domain scope (m*/d* files). The per-track `bySlot` map holds every
// slot for that track (track-level overviews + every domain's videos), keyed
// `${slotId}:${kind}`, so the same map overlays both scopes.

export function overlayVideos(data, bySlot) {
  if (!bySlot || !Array.isArray(data.videos) || data.videos.length === 0) {
    return data;
  }
  let changed = false;
  const videos = data.videos.map((v) => {
    const b = bySlot.get(`${v.id}:video`);
    if (!b) return v;
    changed = true;
    return { ...v, url: b.url, status: "published", provider: v.provider || "file" };
  });
  return changed ? { ...data, videos } : data;
}

// Back-compat alias — the track endpoint imported this name.
export const overlayTrackVideos = overlayVideos;
