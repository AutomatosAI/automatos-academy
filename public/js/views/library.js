// Source library (annotated resources) + the video hub (YouTube embeds with
// placeholder slots and the "produce more" pointer).
//
// Admin overlay (PRD-WAVE-CONTENT-OPS C3): for an allow-listed admin, each
// video card grows an Upload/Replace control pinned inside its frame. The
// upload goes straight to S3 (presign → PUT → bind) and the card swaps to the
// live video in place — no republish, no reload. For everyone else the DOM is
// byte-identical to before (the control is only appended when isAdminSync()).
import { el, clear } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { resList } from "./parts.js";
import { allResources, allVideos, invalidateTrack } from "../content.js";
import { isAdminSync, ensureAdmin, uploadVideo } from "../admin/media.js";

export function libraryView(ctx) {
  const { track } = ctx;
  const res = allResources(track);
  const official = res.filter((r) => r.official);
  const rest = res.filter((r) => !r.official);
  return el("div", {}, [trackHeader(track, "library"), section(
    el("h1", { style: { fontSize: "clamp(28px,4vw,44px)" }, text: "Source library" }),
    el("p", { class: "lede muted", style: { maxWidth: "64ch", marginTop: "14px" }, text: "Read the thing the exam is actually testing. Primary sources first, each annotated with what to extract — not a wall of links." }),
    official.length ? el("h2", { class: "serif-i", style: { fontSize: "24px", margin: "32px 0 14px" }, text: "Official & primary" }) : null,
    official.length ? resList(official) : null,
    rest.length ? el("h2", { class: "serif-i", style: { fontSize: "24px", margin: "40px 0 14px" }, text: "Deeper reading" }) : null,
    rest.length ? resList(rest) : null,
    !res.length ? el("p", { class: "muted", text: "Resources coming soon." }) : null,
  )]);
}

function ytEmbed(u) {
  try {
    const url = new URL(u);
    let id = "";
    if (url.hostname.includes("youtu.be")) id = url.pathname.slice(1);
    else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2];
    else id = url.searchParams.get("v") || "";
    return id ? `https://www.youtube.com/embed/${id}` : u;
  } catch (_) { return u; }
}

const isFileUrl = (url) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url || "");
const fileVideoEl = (url) => el("video", { src: url, controls: true, preload: "metadata", playsinline: true });

// A video is either a self-hosted file (provider "file" or a media URL),
// rendered with <video>, or a YouTube embed rendered with <iframe>.
function videoFrame(vd) {
  const published = vd.status === "published" && vd.url;
  if (!published) return el("div", { class: "frame placeholder" }, [el("div", { class: "play" }, ["▶"])]);
  const isFile = vd.provider === "file" || isFileUrl(vd.url);
  return el("div", { class: "frame" }, [
    isFile
      ? fileVideoEl(vd.url)
      : el("iframe", { src: ytEmbed(vd.url), title: vd.title, loading: "lazy", allow: "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowfullscreen: true }),
  ]);
}

// The admin Upload/Replace control, pinned inside a video frame. On success it
// swaps the frame to the live <video> in place and flips the label to Replace.
function uploadControl(vd, adminCtx, refs) {
  const input = el("input", { type: "file", accept: "video/mp4", style: { display: "none" } });
  const btn = el("button", { type: "button", "aria-label": "Upload video", style: {
    font: "600 12px/1 ui-monospace,monospace", letterSpacing: ".04em", textTransform: "uppercase",
    padding: "7px 12px", borderRadius: "999px", border: "1px solid rgba(255,255,255,.35)",
    background: "rgba(20,20,25,.72)", color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)",
  }, text: vd.status === "published" && vd.url ? "Replace" : "Upload" });
  const status = el("div", { style: {
    display: "none", font: "600 11px/1.35 ui-monospace,monospace", padding: "5px 9px", borderRadius: "7px",
    background: "rgba(20,20,25,.85)", color: "#fff", maxWidth: "190px", textAlign: "right",
  } });
  const setStatus = (t) => { status.textContent = t || ""; status.style.display = t ? "block" : "none"; };
  const wrap = el("div", { style: {
    position: "absolute", top: "8px", right: "8px", display: "flex", flexDirection: "column",
    alignItems: "flex-end", gap: "6px", zIndex: "2",
  } }, [btn, status, input]);

  btn.addEventListener("click", () => { if (!btn.disabled) input.click(); });
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    input.value = ""; // allow re-picking the same file after an error
    if (!file) return;
    btn.disabled = true;
    setStatus("Uploading… 0%");
    try {
      const { url } = await uploadVideo({
        vendor: adminCtx.vendor, track: adminCtx.track, slotId: vd.id, file,
        onProgress: (p) => setStatus(`Uploading… ${Math.round(p * 100)}%`),
      });
      invalidateTrack(adminCtx.vendor, adminCtx.track); // next visit re-reads the overlay
      // optimistic in-place swap — the admin sees the video immediately
      clear(refs.frame);
      refs.frame.classList.remove("placeholder");
      refs.frame.appendChild(fileVideoEl(url));
      refs.frame.appendChild(wrap); // re-attach the same control over the new frame
      if (refs.capComing && refs.capComing.parentNode) refs.capComing.remove();
      btn.textContent = "Replace";
      setStatus("");
    } catch (e) {
      setStatus(e && e.message ? e.message : "Upload failed.");
    } finally {
      btn.disabled = false;
    }
  });
  return wrap;
}

function videoCard(vd, adminCtx) {
  const published = vd.status === "published" && vd.url;
  const frame = videoFrame(vd);
  const capComing = !published ? el("div", { class: "mono-label", style: { marginTop: "8px", color: "var(--muted)" }, text: "Video coming" }) : null;
  const card = el("div", { class: "vid-card" }, [
    frame,
    el("div", { class: "cap" }, [
      el("span", { class: "mono-label", text: vd.domainName || "" }),
      el("div", { class: "serif", style: { fontSize: "18px", marginTop: "6px" }, text: vd.title }),
      capComing,
    ]),
  ]);
  // Admin-only: append the upload control inside the frame (positioned parent).
  // Guarded by isAdminSync() AND a slot id, so non-admins get today's exact DOM.
  if (adminCtx && isAdminSync() && vd.id) {
    frame.style.position = "relative";
    frame.appendChild(uploadControl(vd, adminCtx, { frame, capComing }));
  }
  return card;
}

export function videosView(ctx) {
  const { track } = ctx;
  const adminCtx = { vendor: track.vendorId, track: track.trackId };
  // Probe admin once. If it flips us to admin AFTER this first render, re-render
  // so the Upload affordances appear — idempotent, because the second pass sees
  // isAdminSync()===true and skips the probe (no loop).
  if (!isAdminSync()) {
    ensureAdmin().then(({ admin }) => { if (admin) window.dispatchEvent(new HashChangeEvent("hashchange")); });
  }
  const overview = (track.videos || []).map((v) => ({ ...v, domainName: "Course overview" }));
  const vids = allVideos(track);
  const grid = (list) => el("div", { class: "vid-grid", style: { marginTop: "20px" } }, list.map((v) => videoCard(v, adminCtx)));
  return el("div", {}, [trackHeader(track, "videos"), section(
    el("h1", { style: { fontSize: "clamp(28px,4vw,44px)" }, text: "Video hub" }),
    el("p", { class: "lede muted", style: { maxWidth: "64ch", marginTop: "14px" }, text: "Short, focused overviews — produced with NotebookLM, hosted on Automatos. Watch the course primers first, then the per-domain deep dives." }),
    overview.length ? el("h2", { class: "serif-i", style: { fontSize: "24px", margin: "34px 0 6px" }, text: "Start here" }) : null,
    overview.length ? grid(overview) : null,
    el("h2", { class: "serif-i", style: { fontSize: "24px", margin: "40px 0 6px" }, text: "By domain" }),
    vids.length ? grid(vids) : el("p", { class: "muted", text: "Videos coming soon." }),
    el("p", { class: "muted", style: { marginTop: "26px", fontSize: "13px" } }, ["Producing more: see ", el("b", { text: "docs/VIDEO_PIPELINE.md" }), "."]),
  )]);
}
