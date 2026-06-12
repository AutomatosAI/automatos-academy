// Scenario simulator — index + an interactive branching run with graded
// rationale at every decision and a scored debrief.
import { el, clear, seal } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { linkList } from "./parts.js";
import { url } from "../router.js";
import { allScenarios, scenarioById } from "../content.js";
import { md } from "../markdown.js";
import * as Scn from "../engine/scenario.js";

const KEYS = "ABCDEFGH";
const strip = (s) => md(s || "").replace(/^<p>|<\/p>\s*$/g, "");
const gradeFor = (pct) => (pct >= 90 ? "A+" : pct >= 82 ? "A" : pct >= 72 ? "B+" : pct >= 60 ? "C" : "F");

export function scenariosIndex(ctx) {
  const { track } = ctx;
  const v = track.vendorId, t = track.trackId;
  const list = allScenarios(track);
  return el("div", {}, [trackHeader(track, "scenarios"), section(
    el("h1", { style: { fontSize: "clamp(28px,4vw,44px)" }, text: "Scenario drills" }),
    el("p", { class: "lede muted", style: { maxWidth: "64ch", marginTop: "14px" }, text: "Real-world architecture briefs. The exam draws four at random — make the calls and get graded on your reasoning, not just the letter." }),
    list.length
      ? el("div", { style: { marginTop: "26px" } }, [linkList(list.map((s) => ({ label: s.title, href: "#" + url.scenario(v, t, s.id), kind: (s.domainName || "Run").split(" ")[0], note: s.tagline })))])
      : el("p", { class: "muted", style: { marginTop: "20px" }, text: "Scenarios coming soon." }),
  )]);
}

export function scenarioRun(ctx) {
  const { track, store, params } = ctx;
  const v = track.vendorId, t = track.trackId;
  const scn = scenarioById(track, params.scenario);
  if (!scn) return el("div", {}, [trackHeader(track, "scenarios"), section(el("p", { text: "Scenario not found." }))]);
  const root = el("div", {});
  let state = Scn.start(scn);

  const brief = () => el("div", { class: "scn-context" }, [
    el("span", { class: "mono-label", text: "The brief · " + scn.title }),
    el("div", { class: "prose", style: { marginTop: "10px" }, html: md(scn.context || "") }),
  ]);

  function renderStep() {
    clear(root);
    root.appendChild(trackHeader(track, "scenarios"));
    const step = Scn.currentStep(state);
    root.appendChild(section(brief(), el("div", { class: "scn-step" }, [
      el("span", { class: "mono-label", text: `Decision ${state.path.length + 1}` }),
      el("h3", { style: { marginTop: "8px" }, text: step.prompt }),
      el("div", { class: "scn-choices", style: { marginTop: "14px" } }, (step.choices || []).map((c, i) => {
        const b = el("button", { class: "opt", type: "button" }, [el("span", { class: "key", text: KEYS[i] }), el("span", { html: strip(c.text) })]);
        b.addEventListener("click", () => reveal(step, c));
        return b;
      })),
    ])));
    window.scrollTo({ top: 0 });
  }

  function reveal(step, choice) {
    const next = Scn.choose(state, choice.id);
    const last = next.path[next.path.length - 1];
    clear(root);
    root.appendChild(trackHeader(track, "scenarios"));
    root.appendChild(section(brief(), el("div", { class: "scn-step" }, [
      el("span", { class: "mono-label", text: `Decision ${next.path.length}` }),
      el("h3", { style: { marginTop: "8px" }, text: step.prompt }),
      el("div", { class: "row", style: { margin: "10px 0 14px" } }, [el("span", { class: "verdict-chip " + last.verdict, text: last.verdict })]),
      el("p", { class: "serif-i", style: { fontSize: "18px" }, text: `You chose: ${last.choiceText}` }),
      el("div", { class: "explain", style: { borderTop: "none", paddingTop: "8px" }, html: md(last.rationale || "") }),
      last.verdict !== "best" ? el("p", { class: "muted", style: { marginTop: "10px" } }, [el("b", { text: "Best call: " }), last.best]) : null,
      el("button", { class: "ac-btn ac-btn-solid", style: { marginTop: "20px" }, type: "button", onClick: () => { state = next; state.done ? finish() : renderStep(); } }, [next.done ? "See debrief →" : "Continue →"]),
    ])));
    window.scrollTo({ top: 0 });
  }

  function finish() {
    const db = Scn.debrief(state);
    store.pushScenario(scn.id, db.pct);
    clear(root);
    root.appendChild(trackHeader(track, "scenarios"));
    root.appendChild(section(
      el("div", { class: "ready-hero" }, [
        seal(gradeFor(db.pct), "Scenario", "lg"),
        el("div", { class: "verdict" }, [
          el("span", { class: "mono-label", text: "Debrief" }),
          el("h2", { text: `${scn.title} — ${db.pct}%` }),
          el("p", { text: db.pct >= 85 ? "Architect-grade reasoning. This is the standard A+ demands." : "Re-run after reviewing — the best calls are explained below." }),
        ]),
      ]),
      el("div", { class: "scn-debrief", style: { marginTop: "28px" } }, db.steps.map((p, i) =>
        el("div", { class: "step-review" }, [
          el("div", { class: "row", style: { gap: "10px" } }, [el("span", { class: "mono-label", text: `Decision ${i + 1}` }), el("span", { class: "verdict-chip " + p.verdict, text: p.verdict })]),
          el("p", { class: "serif-i", style: { fontSize: "18px", margin: "8px 0" }, text: p.prompt }),
          el("p", { class: "muted", text: `Your call: ${p.choiceText}` }),
          p.verdict !== "best" ? el("p", { class: "muted" }, [el("b", { text: "Best: " }), p.best]) : null,
          el("div", { class: "explain", style: { borderTop: "none", paddingTop: "6px" }, html: md(p.rationale || "") }),
        ])
      )),
      el("div", { class: "row", style: { marginTop: "26px" } }, [
        el("button", { class: "ac-btn ac-btn-solid", type: "button", onClick: () => { state = Scn.start(scn); renderStep(); } }, ["Re-run scenario"]),
        el("a", { class: "ac-btn", href: "#" + url.scenarios(v, t) }, ["All scenarios"]),
      ]),
    ));
    window.scrollTo({ top: 0 });
  }

  renderStep();
  return root;
}
