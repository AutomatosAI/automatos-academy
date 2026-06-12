// Source library (annotated resources) + the video hub (YouTube embeds with
// placeholder slots and the "produce more" pointer).
import { el } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { resList } from "./parts.js";
import { allResources, allVideos } from "../content.js";

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

export function videosView(ctx) {
  const { track } = ctx;
  const vids = allVideos(track);
  const card = (vd) => {
    const published = vd.status === "published" && vd.url;
    return el("div", { class: "vid-card" }, [
      el("div", { class: "frame" + (published ? "" : " placeholder") },
        published
          ? [el("iframe", { src: ytEmbed(vd.url), title: vd.title, loading: "lazy", allow: "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowfullscreen: true })]
          : [el("div", { class: "play" }, ["▶"])]),
      el("div", { class: "cap" }, [
        el("span", { class: "mono-label", text: vd.domainName || "" }),
        el("div", { class: "serif", style: { fontSize: "18px", marginTop: "6px" }, text: vd.title }),
        !published ? el("div", { class: "mono-label", style: { marginTop: "8px", color: "var(--muted)" }, text: "Video coming" }) : null,
      ]),
    ]);
  };
  return el("div", {}, [trackHeader(track, "videos"), section(
    el("h1", { style: { fontSize: "clamp(28px,4vw,44px)" }, text: "Video hub" }),
    el("p", { class: "lede muted", style: { maxWidth: "64ch", marginTop: "14px" }, text: "Short, focused overviews per domain. Produced with NotebookLM, hosted unlisted on YouTube — and there's a documented pipeline to make more." }),
    vids.length ? el("div", { class: "vid-grid", style: { marginTop: "26px" } }, vids.map(card)) : el("p", { class: "muted", text: "Videos coming soon." }),
    el("p", { class: "muted", style: { marginTop: "24px", fontSize: "13px" } }, ["Producing more: see ", el("b", { text: "docs/VIDEO_PIPELINE.md" }), " — source → NotebookLM Video Overview → unlisted YouTube → register in the domain's ", el("code", { text: "videos[]" }), "."]),
  )]);
}
