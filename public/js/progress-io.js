// Progress backup / restore. Progress is local-first (localStorage, per device),
// so a cleared browser or a new machine loses everything. This lets a learner
// carry ALL their academy progress — every track, plus claimed-name and
// spaced-repetition state — to another browser or keep a backup file. Pure
// client: exports a JSON file, imports it back; while signed out, nothing
// leaves the device. Optional sign-in (PRD-U1/U2) adds server-side sync as
// the convenient path — this file backup stays the account-free one.
const PREFIX = "automatos-academy:";
const SCHEMA = "automatos-academy-progress/v1";

export function snapshot() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) data[k] = localStorage.getItem(k);
  }
  return { schema: SCHEMA, exportedAt: new Date().toISOString(), keys: Object.keys(data).length, data };
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automatos-academy-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Merge-restore: writes backed-up keys over local ones (a restore is meant to
// bring a device up to date, not to intersect). Returns a result for the UI.
export function importBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (_) { return { ok: false, error: "That file isn't valid JSON." }; }
  if (!parsed || parsed.schema !== SCHEMA || !parsed.data || typeof parsed.data !== "object") {
    return { ok: false, error: "That isn't an Automatos Academy backup file." };
  }
  let restored = 0;
  for (const k in parsed.data) {
    if (k.startsWith(PREFIX) && typeof parsed.data[k] === "string") {
      try { localStorage.setItem(k, parsed.data[k]); restored++; } catch (_) { /* quota — skip */ }
    }
  }
  return { ok: true, restored };
}
