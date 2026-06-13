/**
 * Automatos Academy — learning platform server.
 *
 * Mirrors the automatos-landing server shape so the Railway container is a
 * drop-in sibling. The app itself is a no-build vanilla-JS SPA served from
 * /public; this server only does three things:
 *   - serve static assets with sane cache headers,
 *   - SPA fallback (any non-asset GET → index.html) so refreshes/deep links work,
 *   - reserve /api/* for the future backend (accounts, progress sync, CMS).
 *
 * No backend is required for Phase 1 — progress is local-first (localStorage).
 */
import express from "express";
import compression from "compression";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "public");
const PORT = process.env.PORT || 4321;

// ── Hydrate the tutor's chat config from env at startup ───────────────
// Mirrors the landing site's _config.js pattern. The tutor is a separate
// agent on the Automatos platform; set ACADEMY_CHAT_PUBLIC_KEY (and optionally
// ACADEMY_CHAT_AGENT_ID) from the Academy workspace. Missing vars → empty
// strings, and the tutor shows a graceful "coming online" state.
function hydrateChatConfig() {
  const tpl = resolve(PUBLIC, "chat-config.js.template");
  if (!existsSync(tpl)) return;
  const out = readFileSync(tpl, "utf8")
    .replace(/\$\{ACADEMY_CHAT_PUBLIC_KEY\}/g, process.env.ACADEMY_CHAT_PUBLIC_KEY || "")
    .replace(/\$\{ACADEMY_CHAT_AGENT_ID\}/g, process.env.ACADEMY_CHAT_AGENT_ID || "");
  writeFileSync(resolve(PUBLIC, "chat-config.js"), out, "utf8");
}
hydrateChatConfig();

const app = express();
app.use(compression());
app.use(express.json());

// ── Health check (Railway / uptime) ───────────────────────────────────
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "automatos-academy" }));

// ── API namespace reserved for the future backend ─────────────────────
// Returns 501 today so client code can feature-detect a backend cleanly.
app.use("/api", (_req, res) => res.status(501).json({ error: "not_implemented", note: "Phase 1 is local-first; no backend yet." }));

// ── Static assets ─────────────────────────────────────────────────────
//   .html / manifest   → no-cache (revalidate every request)
//   _*, js, css        → short cache so we can iterate
//   content/*.json     → short cache (content ships often)
//   images, fonts      → 30d
app.use(express.static(PUBLIC, {
  index: "index.html",
  extensions: ["html"],
  maxAge: "30d",
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    } else if (/\.(js|css|json)$/.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
    }
  },
}));

// ── SPA fallback ───────────────────────────────────────────────────────
// Any GET that isn't a real asset (no file extension) renders the shell so
// hash-routed deep links and refreshes resolve.
app.get(/^\/(?!api\/)(?!.*\.[a-zA-Z0-9]+$).*/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(resolve(PUBLIC, "index.html"));
});

// ── 404 (asset misses) ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404);
  const fallback = resolve(PUBLIC, "index.html");
  if (existsSync(fallback)) res.sendFile(fallback);
  else res.send("Not found");
});

app.listen(PORT, () => {
  console.log(`Automatos Academy on http://localhost:${PORT}`);
});
