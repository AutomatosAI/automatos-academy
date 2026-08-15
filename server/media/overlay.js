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

/**
 * Lesson audio (PRD-VOICE §8.1) — a bound `a-<lessonId>` audio slot attaches
 * `audioUrl` to the served lesson, on any node carrying `lessons[]` (domain
 * files). Same contract as overlayVideos: pure, immutable, changed-flag — the
 * cached content index is shared, so mutation would leak across requests.
 * Consumers: the web lesson reader's Listen player, the app's file-backed
 * TextSpeaker, and anything else reading the catalog (agents included).
 */
export function overlayLessonAudio(data, bySlot) {
  if (!bySlot || !Array.isArray(data.lessons) || data.lessons.length === 0) {
    return data;
  }
  let changed = false;
  const lessons = data.lessons.map((l) => {
    const b = bySlot.get(`a-${l.id}:audio`);
    if (!b) return l;
    changed = true;
    return { ...l, audioUrl: b.url };
  });
  return changed ? { ...data, lessons } : data;
}

/**
 * Domain-intro audio (PRD-VOICE §8.1) — a bound `a-<domainId>-intro` slot
 * attaches `introAudioUrl` to the domain scope itself: the narrated overview
 * and objectives, the part a learner hears BEFORE committing to a domain.
 *
 * Keyed off the node's own `id` rather than a lessons[] entry, so it applies
 * only where that id is the domain's — the track scope carries no `lessons[]`
 * and never matches an intro slot. Same contract as its siblings: pure,
 * immutable, changed-flag.
 */
export function overlayIntroAudio(data, bySlot) {
  if (!bySlot || !data?.id || !Array.isArray(data.lessons)) {
    return data;
  }
  const b = bySlot.get(`a-${data.id}-intro:audio`);
  return b ? { ...data, introAudioUrl: b.url } : data;
}

/** the one overlay the catalog applies: videos + lesson audio + intro audio */
export function overlayMedia(data, bySlot) {
  return overlayIntroAudio(overlayLessonAudio(overlayVideos(data, bySlot), bySlot), bySlot);
}
