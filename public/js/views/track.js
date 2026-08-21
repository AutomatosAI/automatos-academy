// Track home (weighted curriculum map) and the per-domain overview page.
import { el, ring } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { subhead, linkList, resList } from "./parts.js";
import { url } from "../router.js";
import { domainById } from "../content.js";
import { domainStats } from "../engine/readiness.js";
import { isSkillsTrack } from "../engine/certificate.js";
import { trackOnce } from "../analytics.js";
import { mdInline } from "../markdown.js";
import { nextStep } from "./next-step.js";

export function trackHome(ctx) {
  const { track, store } = ctx;
  const v = track.vendorId, t = track.trackId;
  const skills = isSkillsTrack(track);
  trackOnce(`start:${v}/${t}`, "track_start", { track: t });

  let resume = null;
  for (const d of track.domains) {
    for (const l of d.lessons || []) { if (!store.lessonDone(l.id)) { resume = { d, l }; break; } }
    if (resume) break;
  }
  const first = track.domains[0];
  const startHref = resume
    ? url.lesson(v, t, resume.d.id, resume.l.id)
    : (first && first.lessons && first.lessons[0] ? url.lesson(v, t, first.id, first.lessons[0].id) : url.track(v, t));

  // LX-10 — "what's next" on ARRIVAL, not only after a completion: returning
  // learners get the same selector every finish panel uses (due reviews →
  // next lesson → weakest drill), so the primary button always names the
  // next smallest step. New visitors keep the plain "Start learning".
  const started = resume ? track.domains.some((dd) => (dd.lessons || []).some((l) => store.lessonDone(l.id))) || Object.keys(store.s.q || {}).length > 0 : false;
  let primaryHref = startHref, primaryLabel = resume ? "Resume " : "Start learning ";
  if (started) {
    const cand = nextStep({ track, store }).find((c) => c.kind !== "done");
    if (cand && cand.href) {
      primaryHref = cand.href.replace(/^#/, "");
      primaryLabel = cand.kind === "due" ? `Continue: ${cand.count} review${cand.count === 1 ? "" : "s"} due `
        : cand.kind === "lesson" ? "Continue: " + (cand.title.length > 34 ? cand.title.slice(0, 33) + "…" : cand.title) + " "
        : cand.kind === "drill" ? `Continue: drill ${cand.name} ` : primaryLabel;
    }
  }

  // LX-8 — first-run orientation: shown ONCE, only to someone the pathfinder
  // just routed here with no progress anywhere on this track. Dismiss is
  // permanent (local flag); returning learners never see it.
  const ORIENT_KEY = "automatos-academy:v1:oriented";
  let orient = null;
  try {
    const fromPathfinder = sessionStorage.getItem("automatos-academy:v1:from-pathfinder") === "1";
    const seen = localStorage.getItem(ORIENT_KEY) === "1";
    const anyProgress = Object.keys(store.s.q || {}).length > 0 || Object.keys(store.s.lessons || {}).length > 0;
    if (fromPathfinder && !seen && !anyProgress) {
      sessionStorage.removeItem("automatos-academy:v1:from-pathfinder");
      const gotIt = el("button", { class: "ac-btn", type: "button", text: "Got it" });
      orient = el("div", { class: "panel orient-card", role: "note" }, [
        el("p", { class: "mono-label", text: "How this works" }),
        el("ul", { class: "orient-list" }, [
          el("li", {}, [el("b", { text: "This page is your course. " }), "Every domain below is a chapter — work top to bottom."]),
          el("li", {}, [el("b", { text: "Start with the first lesson. " }), "The big button always names your next step."]),
          el("li", {}, [el("b", { text: "Your progress saves on this device. " }), "Sign in any time to keep it safe everywhere."]),
        ]),
        gotIt,
      ]);
      gotIt.addEventListener("click", () => {
        try { localStorage.setItem(ORIENT_KEY, "1"); } catch (_) {}
        orient.remove();
      });
    }
  } catch (_) { /* storage unavailable → no orientation, no breakage */ }

  const actions = el("div", { class: "row", style: { gap: "12px", marginBottom: "30px" } }, [
    el("a", { class: "ac-btn ac-btn-solid", href: "#" + primaryHref }, [primaryLabel, el("span", { class: "arr", text: "→" })]),
    skills ? null : el("a", { class: "ac-btn", href: url.exam(v, t) }, ["Take a mock exam"]),
    el("a", { class: "ac-btn", href: url.readiness(v, t) }, [skills ? "My progress" : "My readiness"]),
  ]);

  const map = el("div", { class: "domain-list" }, track.domains.map((d) => {
    const st = domainStats(d, store);
    // Skills tracks have no scored bank — the ring is lesson coverage there.
    return el("a", { class: "domain-row", href: url.domain(v, t, d.id) }, [
      ring((skills ? st.coverage : st.mastery) * 100),
      el("div", { class: "body" }, [
        el("div", { class: "row", style: { gap: "10px" } }, [
          el("span", { class: "mono-label", text: d.code || `D${d.order || ""}` }),
          el("h3", { text: d.name }),
        ]),
        el("p", { class: "obj", text: d.tagline || (d.objectives && d.objectives[0]) || "" }),
        el("div", { class: "row", style: { gap: "16px", marginTop: "8px" } }, [
          el("span", { class: "mono-label", text: `${st.lessonsDone}/${st.lessonsTotal} lessons` }),
          el("span", { class: "mono-label", text: `${st.poolSize} questions` }),
          // LX-2 — media joins the count only when the domain actually has
          // playable video (placeholder slots never inflate the denominator)
          (() => {
            const vids = (d.videos || []).filter((vd) => vd.status === "published" && vd.url && vd.id);
            if (!vids.length) return null;
            const done = store.mediaDoneCount(vids.map((vd) => vd.id));
            return el("span", { class: "mono-label" + (done === vids.length ? " media-count-done" : ""), text: `${done}/${vids.length} videos` });
          })(),
        ]),
      ]),
      skills || !d.weight ? null : el("div", { class: "weight" }, [
        el("div", { class: "wbar" }, [el("i", { style: { width: Math.round(d.weight * 100) + "%" } })]),
        el("span", { class: "pct", text: Math.round(d.weight * 100) + "% of exam" }),
      ]),
    ]);
  }));

  return el("div", {}, [
    trackHeader(track, "overview"),
    section(
      orient,
      actions,
      el("div", { class: "eyebrow", style: { marginBottom: "6px" } }, [el("span", { class: "mono-label", text: skills ? "Curriculum · learn by doing" : "Curriculum · weighted to the exam blueprint" })]),
      map,
    ),
  ]);
}

export function domainView(ctx) {
  const { track, store, params } = ctx;
  const d = domainById(track, params.domain);
  const v = track.vendorId, t = track.trackId;
  if (!d) return el("div", {}, [trackHeader(track, "overview"), section(el("p", { text: "Domain not found." }))]);

  const lessons = d.lessons || [];
  const lessonList = el("div", { class: "res-list" }, lessons.map((l, i) => {
    const done = store.lessonDone(l.id);
    return el("a", { class: "res-row", href: url.lesson(v, t, d.id, l.id) }, [
      el("span", { class: "kind", text: done ? "✓ done" : String(i + 1).padStart(2, "0") }),
      el("div", {}, [
        el("div", { class: "serif", style: { fontSize: "19px" }, text: l.title }),
        l.objective ? el("div", { class: "ann", text: l.objective }) : null,
      ]),
      el("span", { class: "arr serif-i", text: "→" }),
    ]);
  }));

  const blocks = [
    el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "baseline" } }, [
      el("h2", { class: "serif-i", style: { fontSize: "28px" }, text: "Lessons" }),
      (d.questions || []).length ? el("a", { class: "ac-btn", href: url.quiz(v, t, d.id) }, ["Quiz this domain"]) : null,
    ]),
    lessonList,
  ];
  if ((d.scenarios || []).length) {
    blocks.push(subhead("Scenario drills"));
    blocks.push(linkList(d.scenarios.map((s) => ({ label: s.title, href: url.scenario(v, t, s.id), kind: "Run", note: s.tagline }))));
  }
  if ((d.labs || []).length) {
    blocks.push(subhead("Hands-on labs"));
    blocks.push(el("div", { class: "res-list" }, d.labs.map((lab) =>
      el("div", { class: "res-row" }, [
        el("span", { class: "kind", text: "Lab" }),
        el("div", {}, [el("div", { class: "serif", style: { fontSize: "18px" }, text: lab.title }), el("div", { class: "ann", text: lab.goal || "" })]),
      ])
    )));
  }
  if ((d.resources || []).length) {
    blocks.push(subhead("Sources for this domain"));
    blocks.push(resList(d.resources));
  }

  const head = section(
    el("div", { class: "row", style: { gap: "14px", alignItems: "baseline" } }, [
      el("span", { class: "mono-label", text: d.code || "Domain" }),
      d.weight ? el("span", { class: "mono-label", text: Math.round(d.weight * 100) + "% of exam" }) : null,
    ]),
    el("h1", { style: { fontSize: "clamp(30px,4.5vw,48px)", marginTop: "10px" }, text: d.name }),
    d.overview ? el("p", { class: "lede muted", style: { maxWidth: "70ch", marginTop: "14px" }, html: mdInline(d.overview) }) : null,
    (d.objectives || []).length ? el("ul", { class: "prose", style: { marginTop: "18px", maxWidth: "70ch" } }, d.objectives.map((o) => el("li", { text: o }))) : null,
    // PRD-VOICE §8.1 — the narrated intro: this overview and these objectives
    // in Laura's voice, so a learner can hear what a domain covers before
    // committing to it. Bound via the a-<domainId>-intro slot; no binding →
    // no player, and the page looks exactly as it always did.
    d.introAudioUrl
      ? el("audio", {
          controls: true,
          preload: "none",
          src: d.introAudioUrl,
          style: { width: "100%", maxWidth: "720px", display: "block", marginTop: "18px" },
          "aria-label": `Listen to the introduction to ${d.name}`,
        })
      : null,
  );

  return el("div", {}, [trackHeader(track, "overview"), head, section(...blocks)]);
}
