// Domain quiz: ~10 prioritised questions with immediate feedback, a running
// tally, and a completion panel. Feeds the spaced-repetition store.
import { el, clear } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { url } from "../router.js";
import { domainById } from "../content.js";
import { buildQuiz } from "../engine/quiz.js";
import { questionCard } from "./question.js";
import { nextStep, doneLine } from "./next-step.js";
import { accountAsk } from "../account-ask.js";

export function quizView(ctx) {
  const { track, store, params } = ctx;
  const d = domainById(track, params.domain);
  const v = track.vendorId, t = track.trackId;
  if (!d || !(d.questions || []).length) {
    return el("div", {}, [trackHeader(track, "overview"), section(el("p", { text: "No questions for this domain yet." }))]);
  }
  const root = el("div", {});

  function run() {
    const qs = buildQuiz(d, store, Math.min(10, d.questions.length));
    let answered = 0, correct = 0;
    const tally = el("span", { class: "mono-label", text: `0 / ${qs.length} answered` });
    const list = el("div", { class: "stack-24" });
    const finishBox = el("div", { class: "hidden" });

    function finish() {
      const pct = Math.round((correct / qs.length) * 100);
      clear(finishBox);
      finishBox.classList.remove("hidden");
      // Session end-state (PRD-WEB-LOOP §4.4): the link row is state-derived —
      // more due leads; else the next unfinished lesson in this domain; else
      // the closing line + Readiness. Re-quiz stays. The §4.2 ask composes in.
      const cands = nextStep({ track, store, domainId: d.id });
      const due = cands.find((c) => c.kind === "due");
      const lesson = cands.find((c) => c.kind === "lesson");
      const row = [
        due ? el("a", { class: "ac-btn ac-btn-solid", href: due.href }, [`Clear ${due.count} more due →`])
            : lesson ? el("a", { class: "ac-btn ac-btn-solid", href: lesson.href }, [`Next lesson: ${lesson.title} →`]) : null,
        el("button", { class: "ac-btn", type: "button", onClick: run }, ["Re-quiz"]),
        el("a", { class: "ac-btn", href: "#" + url.domain(v, t, d.id) }, ["Back to domain"]),
        !due && !lesson ? el("a", { class: "ac-btn ac-btn-solid", href: "#" + url.readiness(v, t) }, ["Readiness →"]) : null,
      ];
      finishBox.appendChild(el("div", { class: "panel", style: { marginTop: "8px" } }, [
        el("h3", { text: `Quiz complete — ${correct}/${qs.length} (${pct}%)` }),
        el("p", { class: "muted", text: pct >= 80 ? "Strong. This domain is in A+ shape." : "Review the misses and re-quiz — the bank prioritises what you got wrong and what's due." }),
        !due && !lesson ? doneLine() : null,
        el("div", { class: "row", style: { marginTop: "12px" } }, row),
      ]));
      const ask = accountAsk("quiz");
      if (ask) finishBox.appendChild(ask);
      finishBox.scrollIntoView({ behavior: "smooth" });
    }

    qs.forEach((q) => list.appendChild(questionCard(q, {
      reveal: true,
      onAnswer: (_c, ok) => {
        if (ok === undefined) return;
        answered++; if (ok) correct++;
        store.recordAnswer(q.id, ok, d.id);
        tally.textContent = `${answered} / ${qs.length} answered · ${correct} correct`;
        if (answered === qs.length) finish();
      },
    })));

    clear(root);
    root.appendChild(trackHeader(track, "overview"));
    root.appendChild(section(
      el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" } }, [
        el("div", {}, [el("span", { class: "mono-label", text: d.code || "Domain" }), el("h1", { style: { fontSize: "34px", marginTop: "6px" }, text: `Quiz · ${d.name}` })]),
        tally,
      ]),
      list,
      finishBox,
    ));
    window.scrollTo({ top: 0 });
  }

  run();
  return root;
}
