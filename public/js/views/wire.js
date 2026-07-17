// The Wire (PRD-WIRE S2) — agent-written daily news, verified at the door.
// Two views on the public read API: the date-grouped list (#/wire) with type
// chips + tag filters, and the post page (#/wire/:slug) with the Sources box
// (the label is clickable proof, not decoration), the Corrections box, and
// the transparency label. The label string arrives FROM the API
// (`transparency`) so the copy tracks the server's D-W1 publish policy —
// the page never claims a human review that isn't happening.
//
// Feature-detect posture (§4.5): GET /api/wire/posts answering the /api 501
// fallback (or failing) means this deploy has no Wire — the nav entry stays
// hidden and a deep link shows a friendly "isn't switched on" state. Mounted
// but empty shows the honest "warming up" state instead. Static no-DB
// deploys (DEPLOY.md Option A) keep working untouched.
import { el, clear } from "../ui.js";
import { url } from "../router.js";
import { md } from "../markdown.js";
import { track as tk } from "../analytics.js";

// Fallback only for older caches — the live label rides every API response.
const LABEL_FALLBACK = "Researched and written by Automatos agents · every claim linked to its source";

const TYPE_LABELS = {
  "model-news": "Model news",
  "trend": "Trend",
  "new-course": "New course",
  "question-refresh": "Question refresh",
  "changelog": "Changelog",
};

// One fetch of the newest page per view render; the route is max-age=60.
// Resolves {ok, mounted, posts, transparency} — never rejects.
async function fetchList() {
  try {
    const r = await fetch("/api/wire/posts?limit=50");
    if (!r.ok) return { ok: false, mounted: r.status !== 501 && r.status !== 503 };
    const data = await r.json();
    return { ok: true, mounted: true, posts: data.posts || [], transparency: data.transparency || LABEL_FALLBACK };
  } catch (_) {
    return { ok: false, mounted: false };
  }
}

// Module-level detection cache: one probe per session decides the nav entry.
let detectPromise = null;
export function detectWire() {
  if (!detectPromise) {
    detectPromise = fetch("/api/wire/posts?limit=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !!(d && Array.isArray(d.posts) && d.posts.length > 0))
      .catch(() => false);
  }
  return detectPromise;
}

// ── nav entry (§4.5): inserted only when the Wire is on AND non-empty ──
// (an empty feed is anti-marketing — same instinct as the D-W3 teaser
// threshold). Deep links to #/wire keep working either way.
export function mountWireNav() {
  detectWire().then((on) => {
    if (!on || document.querySelector('[data-nav="wire"]')) return;
    const mk = () => el("a", { href: "#" + url.wire(), "data-nav": "wire" }, ["The Wire"]);
    const topnav = document.querySelector(".ac-topnav");
    if (topnav) topnav.appendChild(mk());
    const drawer = document.getElementById("ac-nav-drawer");
    if (drawer) {
      const link = mk();
      link.addEventListener("click", () => { const b = document.getElementById("ac-burger"); if (b && b.classList.contains("is-open")) b.click(); });
      const mood = drawer.querySelector(".ac-drawer-mood");
      drawer.insertBefore(link, mood || null);
    }
    const learnCol = document.querySelector('.ac-footer-col[aria-label="Learn"]');
    if (learnCol) learnCol.appendChild(el("a", { href: "#" + url.wire() }, ["The Wire"]));
  });
}

const label = (text) => el("p", { class: "wire-label", text });

const header = (transparency) => el("div", {}, [
  el("span", { class: "mono-label", text: "The Wire" }),
  el("h1", { style: { fontSize: "clamp(28px,4vw,44px)", marginTop: "10px" }, text: "Agent-written. Source-verified. Daily." }),
  label(transparency),
]);

const wireShell = (...kids) => el("div", { class: "section" }, [el("div", { class: "wrap" }, kids)]);

const emptyState = (title, body) => el("div", { class: "wire-empty" }, [
  el("h2", { class: "serif-i", style: { fontSize: "24px" }, text: title }),
  el("p", { class: "muted", style: { marginTop: "8px", maxWidth: "56ch" }, text: body }),
  el("a", { class: "ac-btn", href: "#" + url.catalog(), style: { marginTop: "18px" } }, ["← Back to the Academy"]),
]);

const offState = () => emptyState(
  "The Wire isn't switched on for this deploy.",
  "This deployment runs without the news backend. Everything else works exactly as always — the courses are all here.",
);

const dayName = (isoStr) => {
  const d = new Date(isoStr);
  return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

const typeChip = (type) => el("span", { class: "chip wire-type", text: TYPE_LABELS[type] || type });

// ── #/wire — the list, grouped by date, filterable by type + tag ───────
export async function wireListView() {
  const r = await fetchList();
  if (!r.ok) {
    return wireShell(r.mounted
      ? emptyState("The Wire is warming up.", "The feed couldn't be reached just now — try again in a minute.")
      : emptyState("The Wire is warming up.", "The Wire isn't switched on for this deploy — this deployment runs without the news backend. Everything else works exactly as always."));
  }
  tk("wire_view");

  if (r.posts.length === 0) {
    return wireShell(header(r.transparency), emptyState(
      "The Wire is warming up.",
      "No posts yet — the first agent-researched briefings land here soon. Every post will carry its sources.",
    ));
  }

  const state = { type: null, tag: null };
  const tags = [...new Set(r.posts.flatMap((p) => p.tags || []))].sort();
  const listEl = el("div", { class: "wire-list" });

  const renderList = () => {
    clear(listEl);
    const posts = r.posts.filter((p) =>
      (!state.type || p.type === state.type) && (!state.tag || (p.tags || []).includes(state.tag)));
    if (!posts.length) {
      listEl.appendChild(el("p", { class: "muted", style: { marginTop: "18px" }, text: "Nothing under that filter yet." }));
      return;
    }
    let day = "";
    for (const p of posts) {
      const d = dayName(p.publishedAt);
      if (d !== day) { day = d; listEl.appendChild(el("h2", { class: "mono-label wire-day", text: d })); }
      listEl.appendChild(el("a", { class: "wire-item", href: "#" + url.wirePost(p.slug) }, [
        el("div", { class: "wire-item-head" }, [
          typeChip(p.type),
          ...(p.tags || []).map((t) => el("span", { class: "mono-label wire-tag", text: t })),
          p.correctionsCount ? el("span", { class: "mono-label wire-corrected", text: "corrected" }) : null,
        ]),
        el("h3", { text: p.title }),
        el("p", { class: "muted", text: p.summary }),
      ]));
    }
  };

  const chipRow = (items, key, allLabel) => {
    const row = el("div", { class: "wire-filter" });
    const btns = [];
    const mkBtn = (value, text) => {
      const b = el("button", { class: "chip wire-chip", type: "button", "aria-pressed": String(state[key] === value), text });
      b.addEventListener("click", () => {
        state[key] = state[key] === value ? null : value;
        btns.forEach((x) => x.el.setAttribute("aria-pressed", String(state[key] === x.value)));
        renderList();
      });
      btns.push({ el: b, value });
      return b;
    };
    row.appendChild(mkBtn(null, allLabel));
    items.forEach((v) => row.appendChild(mkBtn(v, key === "type" ? (TYPE_LABELS[v] || v) : v)));
    return row;
  };

  const typesPresent = [...new Set(r.posts.map((p) => p.type))];
  renderList();
  return wireShell(
    header(r.transparency),
    el("div", { style: { marginTop: "22px" } }, [
      chipRow(typesPresent, "type", "All posts"),
      tags.length ? chipRow(tags, "tag", "All tags") : null,
    ]),
    listEl,
    el("p", { class: "mono-label", style: { marginTop: "30px" } }, [
      el("a", { href: "/wire/rss.xml", class: "ac-ext", text: "Subscribe — RSS ↗" }),
    ]),
  );
}

// ── #/wire/:slug — one post: body, Sources box, Corrections box ────────
export async function wirePostView(ctx) {
  const slugParam = ctx.params.slug;
  let r;
  try { r = await fetch(`/api/wire/posts/${encodeURIComponent(slugParam)}`); }
  catch (_) { return wireShell(offState()); }
  if (r.status === 404) {
    return wireShell(emptyState("That post isn't on the Wire.", "It may have been unpublished, or the link is stale."),
      el("p", { style: { marginTop: "10px" } }, [el("a", { class: "ac-btn", href: "#" + url.wire() }, ["← All Wire posts"])]));
  }
  if (!r.ok) return wireShell(offState());
  const data = await r.json();
  const p = data.post;
  tk("wire_post_view", { slug: p.slug, type: p.type });

  const sourcesBox = el("div", { class: "callout wire-sources" }, [
    el("div", { class: "ct", text: "Sources — what each one supports" }),
    el("ul", {}, (p.sources || []).map((s) => el("li", {}, [
      el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.title || s.url }),
      el("span", { class: "mono-label", text: ` retrieved ${String(s.retrievedAt).slice(0, 10)}` }),
      el("p", { class: "muted", style: { margin: "4px 0 0" }, text: s.claims }),
    ]))),
  ]);
  sourcesBox.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest("a[href]");
    if (a) tk("wire_source_click", { slug: p.slug, url: a.href });
  });

  const corrections = (p.corrections || []).length
    ? el("div", { class: "callout warn wire-corrections" }, [
        el("div", { class: "ct", text: "Corrections" }),
        el("ul", {}, p.corrections.map((c) => el("li", {}, [
          el("span", { class: "mono-label", text: String(c.at).slice(0, 10) + " — " }), c.note,
        ]))),
      ])
    : null;

  const byline = (p.byline && p.byline.agents || []).join(", ") || "Automatos agents";
  return wireShell(
    el("div", { class: "crumbs" }, [
      el("a", { class: "mono-label", href: "#" + url.wire(), text: "The Wire" }),
      el("span", { class: "mono-label", text: "›" }),
      el("span", { class: "mono-label", text: TYPE_LABELS[p.type] || p.type }),
    ]),
    el("h1", { style: { fontSize: "clamp(30px,4.4vw,50px)", marginTop: "14px" }, text: p.title }),
    el("p", { class: "lede muted", style: { maxWidth: "66ch", marginTop: "14px" }, text: p.summary }),
    el("div", { class: "wire-byline" }, [
      el("span", { class: "mono-label", text: `By ${byline} · ${dayName(p.publishedAt)}` }),
      label(data.transparency || LABEL_FALLBACK),
    ]),
    el("div", { class: "prose wire-body", html: md(p.bodyMd) }),
    sourcesBox,
    corrections,
    el("p", { style: { marginTop: "26px" } }, [el("a", { class: "ac-btn", href: "#" + url.wire() }, ["← All Wire posts"])]),
  );
}
