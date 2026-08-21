// Lesson reader: TOC, objective banner, markdown body, inline knowledge
// check, mark-complete, prev/next.
import { el, clear } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { url , setTitle } from "../router.js";
import { domainById, lessonById } from "../content.js";
import { md, toc } from "../markdown.js";
import { questionCard } from "./question.js";
import { nextStep, endNote } from "./next-step.js";
import { accountAsk } from "../account-ask.js";
import { track as tkEvent } from "../analytics.js";

export function lessonView(ctx) {
  const { track, store, params } = ctx;
  const d = domainById(track, params.domain);
  const lesson = d && lessonById(track, params.domain, params.lesson);
  if (lesson) setTitle(`${lesson.title} — ${track.name}`);
  const v = track.vendorId, t = track.trackId;
  // LX-5 — the funnel's missing step between track_start and answering
  if (lesson) tkEvent("lesson_opened", { track: `${v}/${t}`, lesson: lesson.id });
  if (!lesson) return el("div", {}, [trackHeader(track, "overview"), section(el("p", { text: "Lesson not found." }))]);

  const lessons = d.lessons || [];
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons[idx - 1], next = lessons[idx + 1];

  const tocItems = toc(lesson.body || "");
  const tocEl = el("nav", { class: "toc" }, [
    el("div", { class: "mono-label", style: { marginBottom: "10px" }, text: "On this page" }),
    ...tocItems.map((h) => {
      const a = el("a", { href: "#", text: h.text });
      a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); });
      return a;
    }),
  ]);

  const prose = el("article", { class: "prose" }, [
    el("span", { class: "mono-label", text: `${d.name} · Lesson ${idx + 1} of ${lessons.length}` }),
    el("h1", { style: { fontSize: "clamp(30px,4.5vw,46px)", margin: "12px 0 0" }, text: lesson.title }),
    // PRD-VOICE §8.1 — the bound narration (Laura). audioUrl arrives via the
    // serve-time media overlay (a-<lessonId> slot); no binding → no player,
    // and the reader looks exactly as it always did. Native <audio> on
    // purpose: play/pause/seek/speed with zero JS in a no-build SPA.
    lesson.audioUrl
      ? (() => {
          // LX-1/2 — the narration is media too: ≥90% or ended marks it
          // listened (id mirrors the binding slot: a-<lessonId>), with the
          // manual toggle beside the player. Reading and listening are
          // separate completions — this never touches markLesson().
          const audio = el("audio", {
            controls: true,
            preload: "none",
            src: lesson.audioUrl,
            style: { width: "100%", maxWidth: "720px", display: "block", margin: "16px 0 0" },
            "aria-label": `Listen to ${lesson.title}`,
          });
          const mediaId = `a-${lesson.id}`;
          wireMediaEl(audio, store, "narration", mediaId);
          const mark = markToggle(store, "narration", mediaId, { doneLabel: "Listened", markLabel: "Mark listened", unmarkLabel: "Mark unlistened" });
          audio.addEventListener("lx-media-complete", () => mark.refresh && mark.refresh());
          return el("div", {}, [audio, el("div", { style: { marginTop: "6px" } }, [mark])]);
        })()
      : null,
    lesson.objective ? el("div", { class: "objective" }, [el("span", { class: "mono-label k", text: "Objective" }), el("p", { text: lesson.objective })]) : null,
    el("div", { html: md(lesson.body || "") }),
  ]);

  if ((lesson.knowledgeCheck || []).length) {
    prose.appendChild(el("h2", { class: "serif-i", style: { marginTop: "44px" }, text: "Knowledge check" }));
    lesson.knowledgeCheck.forEach((q) => {
      const card = questionCard({ ...q, domainId: d.id }, {
        reveal: true,
        onAnswer: (_chosen, ok) => { if (ok !== undefined) store.recordAnswer(q.id, ok, d.id); },
      });
      card.style.marginBottom = "16px";
      prose.appendChild(card);
    });
  }

  // Session end-state (PRD-WEB-LOOP §4.4): one line under the nav row — the
  // due pull when something is due (the Next button already IS the next
  // lesson, so it never repeats here); nothing due and nothing next ⇒ the
  // closing line. The §4.2 earned-value ask composes in on Mark complete —
  // right after value was created, never before.
  const endHost = el("div", {});
  const renderEnd = (withAsk) => {
    clear(endHost);
    const cands = nextStep({ track, store, domainId: d.id });
    const due = cands.find((c) => c.kind === "due");
    if (due || !next) endHost.appendChild(endNote(cands));
    if (withAsk) {
      const ask = accountAsk("lesson");
      if (ask) endHost.appendChild(ask);
    }
  };

  const doneBtn = el("button", { class: "ac-btn" + (store.lessonDone(lesson.id) ? " ac-btn-solid" : ""), type: "button" },
    [store.lessonDone(lesson.id) ? "✓ Completed" : "Mark complete"]);
  doneBtn.addEventListener("click", () => {
    store.markLesson(lesson.id);
    doneBtn.classList.add("ac-btn-solid");
    doneBtn.textContent = "✓ Completed";
    renderEnd(true);
  });

  prose.appendChild(el("div", { class: "lesson-nav" }, [
    prev ? el("a", { class: "ac-btn", href: url.lesson(v, t, d.id, prev.id) }, ["← Previous"])
         : el("a", { class: "ac-btn", href: url.domain(v, t, d.id) }, ["← Domain"]),
    doneBtn,
    next ? el("a", { class: "ac-btn ac-btn-solid", href: url.lesson(v, t, d.id, next.id) }, ["Next →"])
         : el("a", { class: "ac-btn ac-btn-solid", href: url.quiz(v, t, d.id) }, ["Quiz this domain →"]),
  ]));
  prose.appendChild(endHost);
  if (!next) renderEnd(false); // last-lesson render gets the line up front

  return el("div", {}, [
    trackHeader(track, "overview"),
    el("div", { class: "section" }, [el("div", { class: "wrap" }, [el("div", { class: "reader" }, [tocEl, prose])])]),
  ]);
}
