#!/usr/bin/env node
// Export every live track's teaching content as clean markdown for the
// Academy tutor's knowledge base. The tutor is an Automatos workspace agent:
// upload these files to the Academy workspace KB → the platform auto-extracts
// the knowledge graph → the tutor (and the per-question "Ask the tutor why"
// deep-link) can teach and explain across ALL tracks, not just CCA-F.
//
// Usage: node scripts/export-tutor-corpus.mjs   (writes ./tutor-corpus/, derived+gitignored)
// Run AFTER content changes land (validator green) so the tutor learns the
// corrected corpus. One file per domain/module keeps KB chunks and the graph
// clean; INDEX.md is the upload checklist.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "public", "content");
const OUT = join(ROOT, "tutor-corpus");

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const manifest = read(join(CONTENT, "manifest.json"));

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

const index = [];
const corpusFiles = []; // per-file {file, vendor, track, domain, lane, kind, title, tags} → sync tags each doc to its course
let files = 0, lessons = 0, questions = 0;
const tagStr = (...xs) => xs.filter(Boolean).join(",");

for (const v of manifest.vendors) {
  for (const t of v.tracks || []) {
    if (t.status !== "live") continue;
    const dir = join(CONTENT, v.id, t.trackId);
    let tj;
    try { tj = read(join(dir, "track.json")); } catch (_) { continue; }
    const slug = `${v.id}--${t.trackId}`;
    mkdirSync(join(OUT, slug), { recursive: true });

    // Track overview doc — gives the graph the track entity + its meaning.
    const head = [
      `# ${tj.name} (${tj.code || t.trackId}) — Automatos Academy track overview`,
      ``,
      `Vendor/lane: ${v.name} · ${t.lane || "practitioner"} lane. ${tj.summary || ""}`,
      tj.blueprintNote ? `\nBlueprint: ${tj.blueprintNote}` : "",
      tj.badge ? `\nCompletion badge: **${tj.badge.completionLabel}** — ${tj.badge.definition}` : "",
      tj.exam ? `\nMock-exam format: ${tj.exam.questionCount} questions · ${tj.exam.durationMinutes} min · pass ${tj.exam.passingScore}/${tj.exam.scoreScale}.` : "\nSkills track — no exam; completion = the hands-on work.",
    ].join("\n");
    writeFileSync(join(OUT, slug, "00-track-overview.md"), head + "\n");
    files++;
    const lane = t.lane || "practitioner";
    corpusFiles.push({
      file: `${slug}/00-track-overview.md`, vendor: v.id, track: t.trackId, domain: null, lane,
      kind: "track-overview", title: `${tj.name} — overview`,
      tags: tagStr("academy", v.id, t.trackId, tj.code, lane),
    });

    for (const df of tj.domainFiles || []) {
      let d;
      try { d = read(join(dir, df)); } catch (_) { continue; }
      const parts = [
        `# ${tj.name} · ${d.code || d.id} — ${d.name}`,
        d.tagline ? `\n*${d.tagline}*` : "",
        d.overview ? `\n${d.overview}` : "",
        (d.objectives || []).length ? `\n**Learning objectives:**\n${d.objectives.map((o) => `- ${o}`).join("\n")}` : "",
      ];

      for (const l of d.lessons || []) {
        lessons++;
        parts.push(`\n---\n\n## Lesson: ${l.title}`);
        if (l.objective) parts.push(`*Objective: ${l.objective}*`);
        parts.push(l.body || "");
        for (const kc of l.knowledgeCheck || []) {
          questions++;
          const correct = (kc.options || []).filter((o) => o.correct).map((o) => o.text).join(" / ");
          parts.push(`\n**Check — ${kc.stem}**\nCorrect answer: ${correct}\nWhy: ${kc.explanation || ""}`);
        }
      }

      const qs = d.questions || [];
      if (qs.length) {
        parts.push(`\n---\n\n## Self-check bank (${qs.length} questions — answers and the *why*, for tutoring)`);
        for (const q of qs) {
          questions++;
          const correct = (q.options || []).filter((o) => o.correct).map((o) => o.text).join(" / ");
          parts.push(`\n**Q (${q.id}): ${q.stem}**\nCorrect answer: ${correct}\nWhy each option is right or wrong: ${q.explanation || ""}`);
        }
      }

      const fname = df.replace(/\.json$/, ".md");
      writeFileSync(join(OUT, slug, fname), parts.filter(Boolean).join("\n") + "\n");
      files++;
      index.push(`- ${slug}/${fname} — ${tj.code || t.trackId} ${d.code || ""} ${d.name}`);
      corpusFiles.push({
        file: `${slug}/${fname}`, vendor: v.id, track: t.trackId, domain: d.id, lane: t.lane || "practitioner",
        kind: "domain", title: `${tj.name} · ${d.name}`,
        tags: tagStr("academy", v.id, t.trackId, d.id, d.code),
      });
    }
  }
}

writeFileSync(join(OUT, "INDEX.md"),
  `# Tutor corpus — upload checklist\n\nGenerated ${new Date().toISOString().slice(0, 10)} from the live tracks. Upload every file below to the Academy workspace Knowledge Base (the knowledge graph builds automatically). Re-export + re-upload after content releases.\n\n${index.join("\n")}\n`);

// Machine-readable sibling of INDEX.md — scripts/sync-tutor-corpus.mjs reads it
// to push each doc to the Academy workspace with per-course `tags` (so the
// knowledge graph maps every chunk back to its vendor/track/domain).
writeFileSync(join(OUT, "corpus-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), files: corpusFiles }, null, 2) + "\n");

console.log(`tutor-corpus: ${files} files · ${lessons} lessons · ${questions} Q/A across ${index.length} domain docs — ready to upload (corpus-manifest.json written)`);
