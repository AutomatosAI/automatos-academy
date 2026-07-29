#!/usr/bin/env node
// PRD-VOICE §8.1 — bind the rendered catalogue into media_bindings, the
// deliberate step after `Render voice catalogue`. Walks a bindings.json
// (the render's artifact) and POSTs each row to the C3 admin bind API —
// which HEADs every object before writing, so a binding can never dangle.
//
//   ACADEMY_ADMIN_KEY=… node scripts/bind-voice-catalog.mjs <bindings.json> --apply
//
// Without --apply it prints the plan and touches nothing. Idempotent:
// re-binding upserts, and re-running after a partial failure re-sends only
// what you ask it to (the server makes duplicates harmless).

import { readFile } from "node:fs/promises";

const BASE = (process.env.ACADEMY_BASE || "https://academy.automatos.app").replace(/\/+$/, "");

async function main() {
  const [file] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const apply = process.argv.includes("--apply");
  const key = process.env.ACADEMY_ADMIN_KEY;
  if (!file) { console.error("usage: bind-voice-catalog.mjs <bindings.json> [--apply]"); process.exit(1); }
  const rows = JSON.parse(await readFile(file, "utf8"));
  console.log(`${rows.length} bindings → ${BASE}/api/admin/media/bind ${apply ? "(APPLY)" : "(dry-run — pass --apply)"}`);
  if (!apply) {
    for (const r of rows.slice(0, 3)) console.log(`  · ${r.vendor}/${r.track} ${r.slotId} → ${r.url}`);
    if (rows.length > 3) console.log(`  · … ${rows.length - 3} more`);
    return;
  }
  if (!key) { console.error("ACADEMY_ADMIN_KEY required for --apply"); process.exit(1); }
  let ok = 0; const failures = [];
  for (const r of rows) {
    const res = await fetch(`${BASE}/api/admin/media/bind`, {
      method: "POST",
      headers: { "X-Admin-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ vendor: r.vendor, track: r.track, slotId: r.slotId, kind: "audio", url: r.url }),
    });
    if (res.ok) { ok++; if (ok % 25 === 0) console.log(`  … ${ok}/${rows.length}`); }
    else failures.push(`${r.slotId}: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 160));
  }
  console.log(`bound ${ok}/${rows.length}`);
  if (failures.length) { console.error("FAILURES:"); failures.slice(0, 10).forEach((f) => console.error("  ✗ " + f)); process.exit(1); }
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
