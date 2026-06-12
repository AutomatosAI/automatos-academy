// Lesson reader: TOC, objective banner, markdown body, inline knowledge
// check, mark-complete, prev/next.
import { el } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { url } from "../router.js";
import { domainById, lessonById } from "../content.js";
import { md, toc } from "../markdown.js";
import { questionCard } from "./question.js";

export function lessonView(ctx) {
  const { track, store, params } = ctx;
  const d = domainById(track, params.domain);
  const lesson = d && lessonById(track, params.domain, params.lesson);
  const v = track.vendorId, t = track.trackId;
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

  const doneBtn = el("button", { class: "ac-btn" + (store.lessonDone(lesson.id) ? " ac-btn-solid" : ""), type: "button" },
    [store.lessonDone(lesson.id) ? "✓ Completed" : "Mark complete"]);
  doneBtn.addEventListener("click", () => { store.markLesson(lesson.id); doneBtn.classList.add("ac-btn-solid"); doneBtn.textContent = "✓ Completed"; });

  prose.appendChild(el("div", { class: "lesson-nav" }, [
    prev ? el("a", { class: "ac-btn", href: "#" + url.lesson(v, t, d.id, prev.id) }, ["← Previous"])
         : el("a", { class: "ac-btn", href: "#" + url.domain(v, t, d.id) }, ["← Domain"]),
    doneBtn,
    next ? el("a", { class: "ac-btn ac-btn-solid", href: "#" + url.lesson(v, t, d.id, next.id) }, ["Next →"])
         : el("a", { class: "ac-btn ac-btn-solid", href: "#" + url.quiz(v, t, d.id) }, ["Quiz this domain →"]),
  ]));

  return el("div", {}, [
    trackHeader(track, "overview"),
    el("div", { class: "section" }, [el("div", { class: "wrap" }, [el("div", { class: "reader" }, [tocEl, prose])])]),
  ]);
}
