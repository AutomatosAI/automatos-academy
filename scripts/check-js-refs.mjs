// Static reference check for the browser ES modules under public/js.
//
// Why this exists: the LX wave shipped five `ReferenceError: X is not defined`
// to production. Every PR was green — CI ran the engine tests, which never
// import a view. The bugs were introduced by conflict resolutions that dropped
// import lines while keeping the code that used them, so nothing but a browser
// hitting that exact route could see it.
//
// Two checks, both zero-dependency:
//   A. every named import resolves to a real export in the target module
//   B. no call site references a name this module never binds but another
//      module exports (the dropped-import signature)
//
// Node validates (A) itself at link time, but only for modules it actually
// loads — these are browser modules, so nothing ever links them server-side.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = "public/js";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : [];
  });
}

/** blank out comments and string/template bodies so they can't look like code */
function strip(src) {
  let out = "", i = 0, mode = null, quote = "";
  while (i < src.length) {
    const c = src[i], next = src[i + 1];
    if (mode === null) {
      if (c === "/" && next === "/") { mode = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && next === "*") { mode = "block"; out += "  "; i += 2; continue; }
      if (c === '"' || c === "'" || c === "`") { mode = "str"; quote = c; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === "line") { if (c === "\n") { mode = null; out += c; } else out += " "; i++; continue; }
    if (mode === "block") {
      if (c === "*" && next === "/") { mode = null; out += "  "; i += 2; continue; }
      out += c === "\n" ? c : " "; i++; continue;
    }
    // inside a string: keep template ${...} expressions, blank the literal text
    if (c === "\\") { out += "  "; i += 2; continue; }
    if (c === quote) { mode = null; out += c; i++; continue; }
    if (quote === "`" && c === "$" && next === "{") {
      let depth = 1, j = i + 2, expr = "";
      while (j < src.length && depth > 0) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") { depth--; if (!depth) break; }
        expr += src[j]; j++;
      }
      out += "${" + expr + "}"; i = j + 1; continue;
    }
    out += c === "\n" ? c : " "; i++;
  }
  return out;
}

function namedExports(src) {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(",")) {
      const t = part.trim();
      if (t) names.add((t.includes(" as ") ? t.split(" as ")[1] : t).trim());
    }
  }
  return names;
}

/** [{ names:[local...], spec, raw }] */
function imports(src) {
  const out = [];
  for (const m of src.matchAll(/import\s+([^'"]*?)\s*from\s*['"]([^'"]+)['"]/g)) {
    const clause = m[1], spec = m[2], names = [];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const t = part.trim();
        if (!t) continue;
        const [imported, local] = t.includes(" as ") ? t.split(" as ").map((x) => x.trim()) : [t, t];
        names.push({ imported, local });
      }
    }
    const bare = clause.replace(/\{[^}]*\}/, "").replace(/,/g, "").trim();
    if (bare && !bare.startsWith("*")) names.push({ imported: "default", local: bare });
    const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (ns) names.push({ imported: "*", local: ns[1] });
    out.push({ names, spec });
  }
  return out;
}

/** does this module bind `name` anywhere — declaration, param, key, assignment? */
function binds(src, name) {
  const n = name.replace(/[$]/g, "\\$");
  return [
    new RegExp(`\\b(?:function\\*?|const|let|var|class)\\s+${n}\\b`),
    new RegExp(`[({,\\[]\\s*${n}\\s*[,)}\\]:=]`),   // params + destructuring
    new RegExp(`\\b${n}\\s*=(?!=)`),                 // assignment / default
    new RegExp(`\\b${n}\\s*:`),                      // object key / label
    new RegExp(`\\bcatch\\s*\\(\\s*${n}\\b`),
  ].some((re) => re.test(src));
}

const files = walk(ROOT);
// raw drives import/export parsing (specifiers are string literals, which
// strip() blanks); stripped drives the call-site scan so comments and prose
// inside strings can never look like a call.
const raw = new Map(files.map((f) => [resolve(f), readFileSync(f, "utf8")]));
const sources = new Map([...raw].map(([f, s]) => [f, strip(s)]));
const exportsByFile = new Map([...raw].map(([f, s]) => [f, namedExports(s)]));

const owners = new Map(); // exported name -> [file]
for (const [f, names] of exportsByFile) {
  for (const n of names) owners.set(n, [...(owners.get(n) ?? []), f]);
}

const errors = [];

for (const file of files) {
  const abs = resolve(file);
  const src = sources.get(abs);

  // ── A. named imports must resolve ──────────────────────────────────────
  for (const { names, spec } of imports(raw.get(abs))) {
    if (!spec.startsWith(".")) continue;
    const target = resolve(dirname(abs), spec);
    const known = exportsByFile.get(target);
    if (!known) { errors.push(`${file}: imports from "${spec}" which does not exist`); continue; }
    for (const { imported, local } of names) {
      if (imported === "default" || imported === "*") continue;
      if (!known.has(imported)) {
        errors.push(`${file}: imports { ${imported} } from "${spec}" — not exported there` +
                    (imported !== local ? ` (used as ${local})` : ""));
      }
    }
  }

  // ── B. calls to names this module never binds but another module exports ─
  const imported = new Set(imports(raw.get(abs)).flatMap(({ names }) => names.map((n) => n.local)));
  for (const [name, from] of owners) {
    if (from.includes(abs) || imported.has(name)) continue;
    const called = new RegExp(`(?<![\\w$.])${name.replace(/[$]/g, "\\$")}\\s*\\(`).test(src);
    if (called && !binds(src, name)) {
      errors.push(`${file}: calls ${name}() but never imports or declares it — ` +
                  `exported by ${from.map((f) => relative(process.cwd(), f)).join(", ")}`);
    }
  }
}

if (errors.length) {
  console.error(`check-js-refs: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`check-js-refs: ${files.length} modules OK`);
