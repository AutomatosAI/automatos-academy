// Content inventory (PRD-WAVE-CONTENT-OPS C6) — a flat list of what EXISTS in
// the served content index, so Automatos can diff its generation plan against
// reality and never duplicate content. Pure over the index; served public at
// /api/catalog/inventory (the content is already public — this is just its map).
//
// Hash granularity is per-DOCUMENT (track/domain), the honest available unit:
// a domain's hash changes iff any of its questions/lessons/scenarios changed,
// so "has this domain moved since I last generated?" is answerable exactly.
// Per-item hashing would require re-serialising each item and is deferred.

function push(items, base, extra) {
  items.push({ ...base, ...extra });
}

export function buildInventory(idx) {
  const items = [];
  for (const [key, t] of idx.tracks) {
    const [vendorId, trackId] = key.split("/");
    const td = t.track.data;
    push(items, { scope: "track", vendorId, trackId }, {
      id: key,
      title: td.name || trackId,
      hash: t.track.hash,
    });
    for (const v of td.videos || []) {
      push(items, { scope: "video-slot", vendorId, trackId }, {
        id: v.id,
        title: v.title || v.id,
        status: v.status || (v.url ? "published" : "placeholder"),
        hash: t.track.hash,
      });
    }
    for (const [domainId, d] of t.domains) {
      const dd = d.data;
      push(items, { scope: "domain", vendorId, trackId, domainId }, {
        id: `${key}/${domainId}`,
        title: dd.name || dd.title || domainId,
        hash: d.hash,
      });
      for (const l of dd.lessons || []) {
        push(items, { scope: "lesson", vendorId, trackId, domainId }, {
          id: l.id,
          title: l.title || l.id,
          hash: d.hash,
        });
      }
      for (const q of dd.questions || []) {
        push(items, { scope: "question", vendorId, trackId, domainId }, {
          id: q.id,
          title: (q.stem || "").slice(0, 100),
          hash: d.hash,
        });
      }
      for (const s of dd.scenarios || []) {
        push(items, { scope: "scenario", vendorId, trackId, domainId }, {
          id: s.id,
          title: s.title || s.id,
          hash: d.hash,
        });
      }
    }
  }
  return {
    contentVersion: idx.contentVersion,
    generatedAt: idx.generatedAt,
    count: items.length,
    items,
  };
}
