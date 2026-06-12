// Shared track chrome: the header (crumbs, title, exam spec) + the sticky
// sub-nav used across every track-scoped view.
import { el } from "../ui.js";
import { url } from "../router.js";

function examSpec(spec) {
  if (!spec || !spec.questionCount) return null;
  const rows = [
    [String(spec.questionCount), "Questions"],
    [`${spec.durationMinutes} min`, "Time"],
    [`${spec.passingScore} / ${spec.scoreScale}`, "To pass"],
    [`${spec.scenariosPresented ?? "–"} of ${spec.scenarioPool ?? "–"}`, "Scenarios"],
  ];
  return el("div", { class: "examspec" }, rows.map(([b, l]) =>
    el("div", { class: "spec" }, [el("b", { text: b }), el("span", { class: "mono-label", text: l })])
  ));
}

export function trackHeader(track, active) {
  const v = track.vendorId, t = track.trackId;
  const tabs = [
    ["overview", "Curriculum", url.track(v, t)],
    ["library", "Source library", url.library(v, t)],
    ["videos", "Videos", url.videos(v, t)],
    ["scenarios", "Scenarios", url.scenarios(v, t)],
    ["exam", "Mock exam", url.exam(v, t)],
    ["readiness", "Readiness", url.readiness(v, t)],
  ];
  const subnav = el("nav", { class: "subnav", "aria-label": "Track sections" },
    tabs.map(([key, label, href]) =>
      el("a", { href: "#" + href, text: label, "aria-current": key === active ? "page" : false })
    )
  );
  return el("div", {}, [
    el("div", { class: "track-head" }, [
      el("div", { class: "wrap" }, [
        el("div", { class: "crumbs" }, [
          el("a", { class: "mono-label", href: "#" + url.catalog(), text: track.vendorName || track.vendorId }),
          el("span", { class: "mono-label", text: "›" }),
          el("span", { class: "mono-label", text: track.code || track.trackId }),
        ]),
        el("h1", { text: track.name }),
        track.summary ? el("p", { class: "lede muted", style: { maxWidth: "66ch", marginTop: "16px" }, text: track.summary }) : null,
        examSpec(track.exam),
      ]),
    ]),
    el("div", { class: "wrap" }, [subnav]),
  ]);
}

// Section wrapper used by inner views (keeps content under the same column).
export function section(...children) {
  return el("div", { class: "section" }, [el("div", { class: "wrap" }, children.flat())]);
}
