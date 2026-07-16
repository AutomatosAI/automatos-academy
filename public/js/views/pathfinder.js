// Path finder (#/start) — experience-first, one recommendation (PRD-GROWTH §5,
// broadened per PRD-B0: the curious beginner is a first-class visitor, not an
// edge case). The FIRST question is "where are you with AI?", and "I'm new"
// resolves immediately — nobody curious gets interrogated about their day job
// before we help them. Rule-based on manifest data; no engine coupling: it
// only reads the catalog and emits links.
import { el, clear } from "../ui.js";
import { url } from "../router.js";
import { loadCatalog } from "../content.js";
import { track as tk } from "../analytics.js";

// A small decision tree. Each node is either a question {q, opts:[[value,
// label, next|result]]} or a result (ordered track ids, most-recommended
// first). `next` names another node; `result` short-circuits — the beginner
// path resolves after ONE tap.
const TREE = {
  xp: {
    q: "Where are you with AI today?",
    opts: [
      ["new", "I'm new to it — curious, and I want to actually understand it", { result: ["ai-explained", "ai-business"], tone: "new" }],
      ["user", "I use AI tools day to day and want to go deeper", { next: "comfort" }],
      ["owner", "I want AI doing real work in my business", { next: "ownerGoal" }],
      ["pro", "I build or secure software for a living", { next: "role" }],
    ],
  },
  comfort: {
    q: "How technical are you, honestly?",
    opts: [
      ["non", "Not technical — plain English please", { result: ["ai-explained", "ai-business"], tone: "new" }],
      ["some", "Comfortable with tools, not code", { result: ["ai-business", "platform-architect"] }],
      ["dev", "I write code", { result: ["cca-f", "gh-300"] }],
    ],
  },
  ownerGoal: {
    q: "What do you want out of this?",
    opts: [
      ["outcomes", "AI running parts of the business, this quarter", { result: ["ai-business", "platform-architect"] }],
      ["credential", "A recognised certification to show for it", { result: ["gen-ai-leader", "ai-business"] }],
    ],
  },
  role: {
    q: "Which is closest to your work?",
    opts: [
      ["builder", "I build software", { next: "builderGoal" }],
      ["security", "I own security", { result: ["ai-security", "gh-500"] }],
      ["grc", "I own risk, privacy, or compliance", { result: ["aigp", "ai-security"] }],
    ],
  },
  builderGoal: {
    q: "What do you want out of this?",
    opts: [
      ["credential", "A recognised certification", { result: ["cca-f", "gh-300"] }],
      ["skills", "Deep skills — credential optional", { result: ["platform-architect", "cross-vendor"] }],
    ],
  },
};

// Result-page voice: the curious beginner gets reassurance, not a syllabus.
const TONE = {
  new: {
    kicker: "Start here · no experience needed",
    sub: "Plain English, one everyday analogy for every idea, and no exam at the end. Short modules you can finish with a coffee — and when something clicks, the next step is waiting.",
  },
  default: {
    kicker: "Start here · your path",
    sub: null,
  },
};

export async function pathFinderView() {
  const cat = await loadCatalog();
  const tracks = cat.vendors.flatMap((v) => v.tracks.map((t) => ({ ...t, vendorId: v.id, vendorName: v.name })));
  const byId = Object.fromEntries(tracks.map((t) => [t.trackId, t]));

  const root = el("div", {});
  const answers = {};
  let nodeId = "xp";
  let stepN = 1;

  function question(node) {
    return el("section", { class: "hero" }, [el("div", { class: "wrap", style: { maxWidth: "760px" } }, [
      el("span", { class: "mono-label", text: `Start here · ${stepN === 1 ? "one quick question" : "step " + stepN}` }),
      el("h1", { style: { marginTop: "12px" }, text: node.q }),
      el("div", { class: "pf-opts" }, node.opts.map(([val, label, to]) =>
        el("button", {
          class: "pf-opt", type: "button",
          onClick: () => {
            answers[nodeId] = val;
            if (to.result) return result(to.result, to.tone);
            nodeId = to.next; stepN++; render();
          },
        }, [
          el("span", { class: "serif", style: { fontSize: "20px" }, text: label }),
          el("span", { class: "arr serif-i", text: "→" }),
        ])
      )),
      el("p", { class: "muted", style: { marginTop: "22px", fontSize: "13.5px" } }, [
        "No wrong answers — or ",
        el("a", { href: "#" + url.catalog(), style: { textDecoration: "underline" }, text: "browse every track" }),
        " and wander.",
      ]),
    ])]);
  }

  function result(ids, tone) {
    const recs = ids.map((id) => byId[id]).filter(Boolean);
    const voice = TONE[tone] || TONE.default;
    tk("path_finder", { ...answers, rec: recs.map((r) => r.trackId).join(",") });
    clear(root);
    root.appendChild(el("section", { class: "hero" }, [el("div", { class: "wrap", style: { maxWidth: "760px" } }, [
      el("span", { class: "mono-label", text: voice.kicker }),
      el("h1", { style: { marginTop: "12px" } }, ["Start with ", el("em", {}, [recs[0] ? recs[0].name : "the flagship"]), "."]),
      voice.sub ? el("p", { class: "muted", style: { maxWidth: "56ch", marginTop: "12px" }, text: voice.sub }) : null,
      el("div", { class: "res-list", style: { marginTop: "26px" } }, recs.map((t, i) => {
        const live = t.status === "live";
        return el(live ? "a" : "div", { class: "res-row", href: live ? "#" + url.track(t.vendorId, t.trackId) : null }, [
          el("span", { class: "kind", text: i === 0 ? "Start" : "Then" }),
          el("div", {}, [
            el("div", { class: "serif", style: { fontSize: "19px" }, text: t.name }),
            el("div", { class: "ann", text: live ? (t.summary || "") : "In development — watch this space (or hit Notify me on its card)." }),
          ]),
          el("span", { class: "arr serif-i", text: live ? "→" : "…" }),
        ]);
      })),
      el("div", { class: "row", style: { gap: "10px", marginTop: "26px" } }, [
        el("button", { class: "ac-btn", type: "button", onClick: () => { nodeId = "xp"; stepN = 1; for (const k in answers) delete answers[k]; render(); } }, ["Start over"]),
        el("a", { class: "ac-btn", href: "#" + url.catalog() }, ["See every track"]),
      ]),
    ])]));
  }

  function render() {
    clear(root);
    root.appendChild(question(TREE[nodeId]));
  }

  render();
  return root;
}
