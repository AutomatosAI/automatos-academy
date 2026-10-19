#!/usr/bin/env node
// The deploy lane: migrations → course content publish → server, all inside
// the Railway container (docker-entrypoint.sh), plus the CI gate in front of
// it (.github/workflows/content-publish.yml, validate + dry run only).
//
// Why this exists: production Postgres is reachable only on Railway's private
// network, so the old GitHub Actions publish failed on every content merge
// after 19 Aug 2026 and new content never went live. The publish moved into
// the entrypoint (2026-10-19). These checks pin the parts CI can see without
// building the image:
//   A. the entrypoint's control flow, run under sh with stub `npm`/`node`
//      binaries — which commands run, in what order, and that a failed
//      publish still starts the server while a failed migration does not;
//   B. the workflow holds no database credentials and never writes;
//   C. everything the publish imports ships in the production image
//      (--omit=dev install, nothing the Dockerfile copy excludes).
import { builtinModules } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// ── A. docker-entrypoint.sh control flow ─────────────────────────────────
console.log("entrypoint");
const scratch = mkdtempSync(join(tmpdir(), "academy-entrypoint-"));
const bin = join(scratch, "bin");
mkdirSync(bin);
const callLog = join(scratch, "calls.log");
// Stubs record every call. `npm run <script>` exits with the code the test
// asks for; `node` records its own PID so the test can prove it was exec'd.
writeFileSync(join(bin, "npm"), [
  "#!/bin/sh",
  'echo "npm $*" >> "$FAKE_CALL_LOG"',
  'case "$2" in',
  '  migrate) exit "${FAKE_MIGRATE_EXIT:-0}" ;;',
  '  publish-content) exit "${FAKE_PUBLISH_EXIT:-0}" ;;',
  "esac",
  "exit 0",
  "",
].join("\n"), { mode: 0o755 });
writeFileSync(join(bin, "node"), [
  "#!/bin/sh",
  'echo "node $* pid=$$" >> "$FAKE_CALL_LOG"',
  "exit 0",
  "",
].join("\n"), { mode: 0o755 });

const ENTRYPOINT = join(ROOT, "docker-entrypoint.sh");
function boot(env) {
  rmSync(callLog, { force: true });
  // A clean env on purpose: the CI spine job exports DATABASE_URL, and it must
  // not leak into the cases that test its absence.
  const r = spawnSync("sh", [ENTRYPOINT], {
    cwd: scratch,
    encoding: "utf8",
    env: { PATH: `${bin}:${process.env.PATH}`, FAKE_CALL_LOG: callLog, ...env },
  });
  const lines = existsSync(callLog) ? readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean) : [];
  const calls = lines.map((l) => l.replace(/ pid=\d+$/, ""));
  const nodeLine = lines.find((l) => l.startsWith("node "));
  const nodePid = nodeLine ? Number(nodeLine.split("pid=")[1]) : null;
  return { status: r.status, out: (r.stdout || "") + (r.stderr || ""), calls, nodePid, pid: r.pid };
}
const DB = "postgres://stub@127.0.0.1:1/never-dialled";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const PUBLISH_BANNER = "CONTENT PUBLISH FAILED — serving the last published version";

ok((statSync(ENTRYPOINT).mode & 0o111) !== 0, "docker-entrypoint.sh is executable in git (Dockerfile also chmods it)");

const noDb = boot({ CONTENT_SOURCE: "db" });
ok(noDb.status === 0 && same(noDb.calls, ["node server.js"]),
  `no DATABASE_URL → no migrate, no publish, straight to the server (${noDb.calls.join(" | ")})`);

const filesDefault = boot({ DATABASE_URL: DB });
ok(filesDefault.status === 0 && same(filesDefault.calls, ["npm run migrate", "node server.js"]),
  `DATABASE_URL + CONTENT_SOURCE unset → migrate, no publish (${filesDefault.calls.join(" | ")})`);

const filesMode = boot({ DATABASE_URL: DB, CONTENT_SOURCE: "files" });
ok(filesMode.status === 0 && same(filesMode.calls, ["npm run migrate", "node server.js"]),
  `CONTENT_SOURCE=files → migrate, no publish (${filesMode.calls.join(" | ")})`);

const dbMode = boot({ DATABASE_URL: DB, CONTENT_SOURCE: "db" });
ok(dbMode.status === 0 && same(dbMode.calls, ["npm run migrate", "npm run publish-content", "node server.js"]),
  `CONTENT_SOURCE=db → migrate, then publish, then the server (${dbMode.calls.join(" | ")})`);
ok(!dbMode.out.includes(PUBLISH_BANNER), "a clean publish prints no failure banner");
ok(dbMode.nodePid === dbMode.pid, "the server is exec'd (same PID as the entrypoint), so it receives SIGTERM directly");

const publishFails = boot({ DATABASE_URL: DB, CONTENT_SOURCE: "db", FAKE_PUBLISH_EXIT: "1" });
ok(same(publishFails.calls, ["npm run migrate", "npm run publish-content", "node server.js"]) && publishFails.status === 0,
  `a failed publish does NOT block the boot — the server still starts (${publishFails.calls.join(" | ")})`);
ok(publishFails.out.includes(PUBLISH_BANNER), "…and the failure is loud: the CONTENT PUBLISH FAILED banner is in the log");
ok(publishFails.out.includes('railway ssh --service automatos-academy -- "npm run publish-content"'),
  "…and the banner names the manual lane");

const migrateFails = boot({ DATABASE_URL: DB, CONTENT_SOURCE: "db", FAKE_MIGRATE_EXIT: "1" });
ok(migrateFails.status === 1 && same(migrateFails.calls, ["npm run migrate"]),
  `a failed migration still blocks the boot — no publish, no server, exit 1 (${migrateFails.calls.join(" | ")})`);
ok(migrateFails.out.includes("MIGRATION FAILED"), "…with the MIGRATION FAILED banner");

rmSync(scratch, { recursive: true, force: true });

// ── B. the workflow is a gate, never a writer ────────────────────────────
console.log("content-publish.yml");
const workflow = read(".github/workflows/content-publish.yml");
const code = workflow.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n"); // comments may name what it no longer does
ok(!/secrets\./.test(code), "no secrets referenced — the job has no credentials to anything");
ok(!/DATABASE_URL|DATABASE_PUBLIC_URL/.test(code), "no DATABASE_URL / DATABASE_PUBLIC_URL in the job env");
ok(!/npm run migrate/.test(code), "no migrate step (migrations run on boot)");
const publishRuns = code.split("\n").filter((l) => /publish-content/.test(l) && /\brun:/.test(l));
ok(publishRuns.length === 1 && publishRuns.every((l) => l.includes("--dry-run")),
  `publish-content runs only as --dry-run (${publishRuns.map((l) => l.trim()).join(" | ")})`);
ok(/run: npm run validate\b/.test(code), "npm run validate runs");
ok(/^\s*pull_request:/m.test(code) && /"public\/content\/\*\*"/.test(code), "content PRs trigger the gate");
ok(/npm install --omit=dev/.test(code), "dependencies install as the Dockerfile installs them (--omit=dev)");

// ── C. the publish ships in the production image ─────────────────────────
console.log("production image");
const pkg = JSON.parse(read("package.json"));
const deps = pkg.dependencies || {};
const devDeps = pkg.devDependencies || {};
const dockerfile = read("Dockerfile");
ok(/npm install --omit=dev/.test(dockerfile), "Dockerfile installs production dependencies only");
ok(/^COPY \. \.$/m.test(dockerfile), "Dockerfile copies the repo tree (scripts/, server/, public/, migrations/)");
ok(/CMD \["\.\/docker-entrypoint\.sh"\]/.test(dockerfile), "the image boots through docker-entrypoint.sh");
ok(/^RUN chmod \+x \.\/docker-entrypoint\.sh$/m.test(dockerfile), "…which the Dockerfile marks executable");

const ignored = existsSync(join(ROOT, ".dockerignore"))
  ? read(".dockerignore").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  : [];
const needed = ["scripts", "server", "public", "migrations", "package.json", "docker-entrypoint.sh"];
const excluded = needed.filter((p) => ignored.some((g) => g === p || g === `${p}/` || g === `/${p}` || g === `${p}/**`));
ok(excluded.length === 0, `.dockerignore keeps everything the publish needs${excluded.length ? ` (excludes: ${excluded.join(", ")})` : ""}`);

ok(pkg.scripts?.migrate && pkg.scripts?.["publish-content"] === "node scripts/publish-content.mjs",
  "package.json has the migrate and publish-content scripts the entrypoint calls");
ok("node-pg-migrate" in deps && !("node-pg-migrate" in devDeps), "node-pg-migrate is a production dependency");

// Walk publish-content.mjs's import graph: every bare specifier must be a
// Node builtin or a production dependency, or the --omit=dev image can't run it.
const IMPORT_RE = /^\s*(?:import|export)\s[^'"`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm;
const builtins = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
const seen = new Set();
const bare = new Map(); // specifier → first importer
const missing = [];
const queue = ["scripts/publish-content.mjs"];
while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  for (const m of read(rel).matchAll(IMPORT_RE)) {
    const spec = m[1] || m[2] || m[3];
    if (spec.startsWith(".")) {
      let target = normalize(join(dirname(rel), spec));
      if (existsSync(join(ROOT, target)) && statSync(join(ROOT, target)).isDirectory()) target = join(target, "index.js");
      if (existsSync(join(ROOT, target))) queue.push(target);
      else missing.push(`${rel} → ${spec}`);
    } else if (!bare.has(spec)) {
      bare.set(spec, rel);
    }
  }
}
const pkgName = (spec) => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
const notShipped = [...bare.keys()].filter((s) => !builtins.has(s) && !(pkgName(s) in deps));
ok(seen.size > 5 && missing.length === 0, `publish import graph resolves (${seen.size} modules${missing.length ? `; missing: ${missing.join(", ")}` : ""})`);
ok(notShipped.length === 0,
  `every package the publish imports is a production dependency (${[...bare.keys()].filter((s) => !builtins.has(s)).join(", ")})${notShipped.length ? ` — NOT shipped: ${notShipped.join(", ")}` : ""}`);

// The gate must run on any PR that can change what the publish does: every
// module in its import graph has to match content-publish.yml's
// pull_request paths filter ("dir/**" = prefix, anything else = exact path).
const prPaths = code.match(/^\s*pull_request:\s*\n\s*paths:\s*\n((?:\s*(?:-\s*"[^"]+"|#.*)\s*\n)+)/m);
const prGlobs = prPaths ? [...prPaths[1].matchAll(/-\s*"([^"]+)"/g)].map((m) => m[1]) : [];
const covered = (file) => prGlobs.some((g) => (g.endsWith("/**") ? file.startsWith(g.slice(0, -2)) : file === g));
const uncovered = [...seen].filter((f) => !covered(f));
ok(prGlobs.length > 0 && uncovered.length === 0,
  `content-publish.yml's pull_request paths cover the whole publish import graph${uncovered.length ? ` — missing: ${uncovered.join(", ")}` : ""}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
