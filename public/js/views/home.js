// Platform home (track catalog) + the "learning model" explainer.
import { el } from "../ui.js";
import { loadCatalog } from "../content.js";
import { url } from "../router.js";

const SPINE = [
  ["01", "Learn", "Tutorials that teach the why, not just the what — grounded in primary sources."],
  ["02", "Build", "Hands-on labs against the real API. The exam rewards people who have actually shipped."],
  ["03", "Decide", "Scenario drills: make the architectural calls, get graded on your reasoning."],
  ["04", "Prove", "Full-length, timed mock exams that mirror the real format. No shortcuts."],
  ["05", "Ready", "An honest, graded readiness score. A+ — or not yet. We don't flatter you."],
];

function spine() {
  return el("div", { class: "spine" }, SPINE.map(([n, h, p]) =>
    el("div", { class: "step" }, [el("div", { class: "n", text: n }), el("h3", { text: h }), el("p", { text: p })])
  ));
}

function trackCard(t) {
  const live = t.status === "live";
  const attrs = { class: "track-card" + (live ? "" : " is-soon") };
  if (live) attrs.href = "#" + url.track(t.vendorId, t.trackId);
  return el(live ? "a" : "div", attrs, [
    el("div", { class: "vendor" }, [
      el("span", { class: "mono-label", text: t.vendorName }),
      el("div", { class: "row", style: { gap: "6px" } }, [
        t.flagship ? el("span", { class: "badge flagship", text: "Flagship" }) : null,
        el("span", { class: "badge" + (live ? " live" : ""), text: live ? "Live" : "Soon" }),
      ]),
    ]),
    el("h3", { text: t.name }),
    t.code ? el("span", { class: "mono-label", text: t.code }) : null,
    el("p", { class: "meta", text: t.summary || "" }),
    el("div", { class: "foot" }, [
      el("span", { class: "stat", text: live ? `${t.domains} domains${t.exam ? " · " + t.exam.questionCount + "Q exam" : ""}` : "In development" }),
      live ? el("span", { class: "arr serif-i", text: "→" }) : null,
    ]),
  ]);
}

export async function catalog() {
  const cat = await loadCatalog();
  const tracks = cat.vendors.flatMap((v) => v.tracks.map((t) => ({ ...t, vendorId: v.id, vendorName: v.name })));
  const flagship = tracks.find((t) => t.flagship && t.status === "live") || tracks.find((t) => t.status === "live");

  const hero = el("section", { class: "hero" }, [el("div", { class: "wrap" }, [
    el("div", { class: "eyebrow", style: { marginBottom: "22px" } }, [el("span", { class: "mono-label", text: "Automatos Academy · A+ prep" })]),
    el("h1", {}, ["Learn AI architecture. ", el("em", {}, ["Prove it."])]),
    el("p", { class: "lede" }, [
      "The Automatos learning model — ",
      el("b", { class: "serif-i", text: "Learn → Build → Decide → Prove → Ready" }),
      ". Demanding preparation for people who intend to be in the top percentile, because A+ is the only grade that qualifies.",
    ]),
    el("div", { class: "cta-row" }, [
      flagship ? el("a", { class: "ac-btn ac-btn-solid", href: "#" + url.track(flagship.vendorId, flagship.trackId) }, ["Start the flagship track ", el("span", { class: "arr", text: "→" })]) : null,
      el("a", { class: "ac-btn", href: "#" + url.method() }, ["See the model"]),
    ]),
    spine(),
  ])]);

  const cards = el("section", { class: "section" }, [el("div", { class: "wrap" }, [
    el("div", { class: "eyebrow", style: { marginBottom: "20px" } }, [el("span", { class: "mono-label", text: "Tracks" })]),
    el("div", { class: "grid-tracks" }, tracks.map(trackCard)),
    el("p", { class: "muted", style: { marginTop: "20px", fontSize: "13px" } }, [
      "Same engine, every track. Adding a vendor is a content task, not an engineering one — see ",
      el("a", { href: "https://github.com/AutomatosAI", target: "_blank", rel: "noopener", style: { color: "var(--accent)" }, text: "the authoring guide" }), ".",
    ]),
  ])]);

  return el("div", {}, [hero, cards]);
}

export async function method() {
  const blocks = [
    ["The model", "Automatos teaches one way, everywhere.", "Every track runs the same loop — Learn, Build, Decide, Prove, Ready. It's a deliberately demanding pedagogy: read the primary source, build the thing, defend the architecture, sit the full exam under time, and face an honest verdict. The loop is the product; the subject is interchangeable."],
    ["The standard", "A+ — or not yet.", "Most prep flatters you with a green checkmark for clicking through slides. We don't. Your readiness is a letter grade computed from proven mastery and a real, full-length mock passed with margin. A+ is the only grade that means qualified. Everything below it tells you exactly what's missing and where."],
    ["The proof", "Readiness you can trust.", "Per-domain mastery is weighted to the exam blueprint and gated by how much of the question bank you've actually attempted — so one lucky answer can't fake competence. A spaced-repetition queue keeps what you've learned from decaying. The score is the same whether or not it's flattering."],
    ["The method", "Built for people who ship.", "The flagship credential rewards roughly six months of real hands-on time. So the Academy is hands-on: labs run against the live API, scenarios put you in the architect's chair, and every answer explains the why with a link to the source. Memorising dumps won't get you to A+. Understanding will."],
  ];
  return el("div", {}, [
    el("section", { class: "hero" }, [el("div", { class: "wrap" }, [
      el("div", { class: "eyebrow", style: { marginBottom: "22px" } }, [el("span", { class: "mono-label", text: "The Automatos learning model" })]),
      el("h1", {}, ["How we make ", el("em", {}, ["A+ people."])]),
      spine(),
    ])]),
    el("section", { class: "section" }, [el("div", { class: "wrap", style: { display: "grid", gap: "1px", background: "var(--rule-c)", border: "1px solid var(--rule-c)" } },
      blocks.map(([k, h, p]) => el("div", { style: { background: "var(--bg)", padding: "30px 28px" } }, [
        el("span", { class: "mono-label", text: k }),
        el("h2", { class: "serif-i", style: { fontSize: "30px", margin: "12px 0 12px" }, text: h }),
        el("p", { class: "muted", style: { maxWidth: "70ch", margin: 0 }, text: p }),
      ]))
    )]),
  ]);
}
