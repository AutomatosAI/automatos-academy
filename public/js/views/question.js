// Reusable question widget. Three modes:
//   reveal=true  → immediate feedback (lessons, domain quizzes)
//   reveal=false → store selection silently (mock exam in progress)
//   showExplain  → pre-revealed with the learner's stored answer (exam review)
import { el } from "../ui.js";
import { md } from "../markdown.js";
import { isCorrect, isMulti } from "../engine/quiz.js";

const KEYS = "ABCDEFGH";
const strip = (s) => md(s || "").replace(/^<p>|<\/p>\s*$/g, "");

export function questionCard(q, opts = {}) {
  const { reveal = true, onAnswer, selected = [], showExplain = false } = opts;
  const multi = isMulti(q);
  let chosen = new Set(selected);
  let answered = false;

  const explainBox = el("div", { class: "explain hidden" });

  const optEls = (q.options || []).map((o, i) =>
    el("button", { class: "opt", type: "button" }, [
      el("span", { class: "key", text: KEYS[i] }),
      el("span", { html: strip(o.text) }),
    ])
  );
  optEls.forEach((b, i) => { b._opt = q.options[i]; });

  const syncSel = () => optEls.forEach((b) => b.classList.toggle("sel", chosen.has(b._opt.id)));

  function lockAndExplain(verb) {
    answered = true;
    const ok = isCorrect(q, [...chosen]);
    optEls.forEach((b) => {
      b.disabled = true;
      if (b._opt.correct) b.classList.add("correct");
      else if (chosen.has(b._opt.id)) b.classList.add("incorrect");
    });
    explainBox.classList.remove("hidden");
    explainBox.appendChild(el("span", { class: "v " + (ok ? "ok" : "no"), text: verb || (ok ? "Correct" : "Not quite") }));
    explainBox.appendChild(el("span", { html: md(q.explanation || "") }));
    return ok;
  }

  optEls.forEach((b) => b.addEventListener("click", () => {
    if (answered) return;
    if (multi) { chosen.has(b._opt.id) ? chosen.delete(b._opt.id) : chosen.add(b._opt.id); }
    else chosen = new Set([b._opt.id]);
    syncSel();
    if (!reveal) { if (onAnswer) onAnswer([...chosen]); return; }      // exam: store only
    if (!multi) { const ok = lockAndExplain(); if (onAnswer) onAnswer([...chosen], ok); } // single: reveal now
  }));

  const submitBtn = (multi && reveal)
    ? el("button", { class: "ac-btn", style: { marginTop: "14px" }, type: "button" }, ["Check answer"])
    : null;
  if (submitBtn) submitBtn.addEventListener("click", () => {
    if (answered || !chosen.size) return;
    const ok = lockAndExplain();
    submitBtn.remove();
    if (onAnswer) onAnswer([...chosen], ok);
  });

  const card = el("div", { class: "q-card" }, [
    el("div", { class: "q-meta" }, [
      el("span", { class: "chip diff", text: "Diff " + (q.difficulty || 1) }),
      multi ? el("span", { class: "chip", text: "Select all that apply" }) : null,
    ]),
    el("div", { class: "q-stem", html: strip(q.stem) }),
    q.scenarioContext ? el("p", { class: "muted", style: { fontSize: "13.5px", marginTop: "8px" }, text: q.scenarioContext }) : null,
    el("div", { class: "opts" }, optEls),
    submitBtn,
    explainBox,
  ]);

  syncSel();
  if (showExplain) lockAndExplain(isCorrect(q, [...chosen]) ? "Correct" : "Incorrect");
  return card;
}
