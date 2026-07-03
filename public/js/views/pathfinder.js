// Path finder (#/start) — three questions, one recommendation (PRD-GROWTH §5).
// Rule-based on manifest data; exists for the visitor who doesn't know which
// door they're standing in front of. No engine coupling: it only reads the
// catalog and emits links.
import { el, clear } from "../ui.js";
import { url } from "../router.js";
import { loadCatalog } from "../content.js";
import { track as tk } from "../analytics.js";

const QS = [
  {
    id: "role",
    q: "Which is closest to your day job?",
    opts: [
      ["owner", "I run a business or a team"],
      ["builder", "I build software"],
      ["security", "I own security"],
      ["grc", "I own risk, privacy, or compliance"],
    ],
  },
  {
    id: "goal",
    q: "What do you want out of this?",
    opts: [
      ["outcomes", "AI doing real work in my business"],
      ["credential", "A recognised certification"],
      ["skills", "Deep skills — credential optional"],
    ],
  },
  {
    id: "comfort",
    q: "How technical are you, honestly?",
    opts: [
      ["non", "Not technical — plain English please"],
      ["some", "Comfortable with tools, not code"],
      ["dev", "I write code"],
    ],
  },
];

// (role, goal, comfort) → ordered track ids, most-recommended first.
function recommend(a) {
  // Doesn't know the words yet → the Foundations on-ramp before anything else.
  if (a.comfort === "non") return ["ai-explained", "ai-business"];
  if (a.role === "owner") return a.goal === "credential" ? ["ai-business", "gen-ai-leader"] : ["ai-business", "platform-architect"];
  if (a.role === "grc") return ["aigp", "ai-security"];
  if (a.role === "security") return ["ai-security", "gh-500"];
  if (a.goal === "outcomes") return ["platform-architect", "ai-business"];
  return ["cca-f", "gh-300"];
}

export async function pathFinderView() {
  const cat = await loadCatalog();
  const tracks = cat.vendors.flatMap((v) => v.tracks.map((t) => ({ ...t, vendorId: v.id, vendorName: v.name })));
  const byId = Object.fromEntries(tracks.map((t) => [t.trackId, t]));

  const root = el("div", {});
  const answers = {};
  let step = 0;

  function render() {
    clear(root);
    if (step < QS.length) {
      const { id, q, opts } = QS[step];
      root.appendChild(el("section", { class: "hero" }, [el("div", { class: "wrap", style: { maxWidth: "760px" } }, [
        el("span", { class: "mono-label", text: `Start here · ${step + 1} of ${QS.length}` }),
        el("h1", { style: { marginTop: "12px" }, text: q }),
        el("div", { class: "pf-opts" }, opts.map(([val, label]) =>
          el("button", { class: "pf-opt", type: "button", onClick: () => { answers[id] = val; step++; render(); } }, [
            el("span", { class: "serif", style: { fontSize: "20px" }, text: label }),
            el("span", { class: "arr serif-i", text: "→" }),
          ])
        )),
      ])]));
      return;
    }

    const recs = recommend(answers).map((id) => byId[id]).filter(Boolean);
    tk("path_finder", { ...answers, rec: recs.map((r) => r.trackId).join(",") });
    root.appendChild(el("section", { class: "hero" }, [el("div", { class: "wrap", style: { maxWidth: "760px" } }, [
      el("span", { class: "mono-label", text: "Start here · your path" }),
      el("h1", { style: { marginTop: "12px" } }, ["Start with ", el("em", {}, [recs[0] ? recs[0].name : "the flagship"]), "."]),
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
        el("button", { class: "ac-btn", type: "button", onClick: () => { step = 0; render(); } }, ["Start over"]),
        el("a", { class: "ac-btn", href: "#" + url.catalog() }, ["See every track"]),
      ]),
    ])]));
  }

  render();
  return root;
}
