// Readiness dashboard — the A+ verdict, per-domain mastery, review queue,
// exam history, and the honest "what's missing to qualify".
import { el, seal } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { url } from "../router.js";
import { verdict } from "../engine/readiness.js";

const domGrade = (pct) => (pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 55 ? "C" : pct >= 40 ? "D" : "F");
const gradeVar = (g) => `var(--grade-${g === "A+" ? "aplus" : g === "A" ? "a" : g === "B" ? "b" : g === "C" ? "c" : g === "D" ? "d" : "f"})`;

export function readinessView(ctx) {
  const { track, store } = ctx;
  const v = track.vendorId, t = track.trackId;
  const r = verdict(track, store);
  const masteryPct = Math.round(r.overall.mastery * 100);
  const best = r.bestMock;

  const rows = track.domains.map((d) => {
    const st = r.overall.perDomain[d.id];
    const pct = Math.round(st.mastery * 100);
    const g = domGrade(pct);
    return el("div", { class: "m-row" }, [
      el("div", { class: "lab" }, [el("span", { class: "mono-label", text: d.code || "" }), el("span", { class: "serif", style: { fontSize: "18px" }, text: d.name })]),
      el("span", { class: "g", style: { color: gradeVar(g) }, text: `${pct}% · ${g}` }),
      el("div", { class: "m-bar" }, [el("i", { style: { width: pct + "%" } })]),
    ]);
  });

  const weakHref = r.weakest ? url.quiz(v, t, r.weakest.id) : url.exam(v, t);

  // two-click reset (no blocking dialog)
  const resetBtn = el("button", { class: "ac-btn", type: "button", style: { borderColor: "var(--bad)", color: "var(--bad)" } }, ["Reset my progress"]);
  let armed = false;
  resetBtn.addEventListener("click", () => {
    if (!armed) { armed = true; resetBtn.textContent = "Click again to erase everything"; return; }
    store.reset();
    location.hash = url.readiness(v, t);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

  return el("div", {}, [
    trackHeader(track, "readiness"),
    section(
      el("div", { class: "ready-hero" }, [
        seal(r.grade, r.qualified ? "Qualified" : "Readiness", "lg"),
        el("div", { class: "verdict" }, [
          el("span", { class: "mono-label", text: "Your grade" }),
          el("h2", { text: r.headline }),
          el("p", { text: r.next }),
          r.reasons.length ? el("ul", { class: "prose why", style: { maxWidth: "60ch" } }, r.reasons.map((x) => el("li", { text: x }))) : null,
          el("div", { class: "row", style: { marginTop: "18px" } }, [
            el("a", { class: "ac-btn ac-btn-solid", href: "#" + weakHref }, [r.weakest ? `Drill ${r.weakest.name} →` : "Take a mock →"]),
            el("a", { class: "ac-btn", href: "#" + url.exam(v, t) }, ["Mock exam"]),
          ]),
        ]),
      ]),

      el("div", { class: "panel", style: { marginTop: "34px" } }, [
        el("div", { class: "stat-row" }, [
          el("div", { class: "s" }, [el("b", { text: masteryPct + "%" }), el("span", { class: "mono-label", text: "Weighted mastery" })]),
          el("div", { class: "s" }, [el("b", { text: best ? `${best.scaled}` : "—" }), el("span", { class: "mono-label", text: "Best mock / 1000" })]),
          el("div", { class: "s" }, [el("b", { text: String(r.due) }), el("span", { class: "mono-label", text: "Review due" })]),
          el("div", { class: "s" }, [el("b", { text: (store.s.exams || []).length + "" }), el("span", { class: "mono-label", text: "Mocks sat" })]),
        ]),
      ]),

      el("h3", { class: "serif-i", style: { fontSize: "24px", margin: "40px 0 14px" }, text: "Mastery by domain" }),
      el("p", { class: "muted", style: { fontSize: "13px", marginBottom: "16px" }, text: "Blueprint-weighted. Gated by how much of the bank you've actually attempted — one lucky answer can't fake mastery." }),
      el("div", { class: "mastery" }, rows),

      el("div", { class: "row", style: { marginTop: "48px", justifyContent: "space-between" } }, [
        el("a", { class: "mono-label", href: "#" + url.track(v, t), text: "← Back to curriculum" }),
        resetBtn,
      ]),
    ),
  ]);
}
