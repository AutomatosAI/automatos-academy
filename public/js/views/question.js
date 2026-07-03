// Reusable question widget. Three modes:
//   reveal=true  → immediate feedback (lessons, domain quizzes)
//   reveal=false → store selection silently (mock exam in progress)
//   showExplain  → pre-revealed with the learner's stored answer (exam review)
import { el } from "../ui.js";
import { md } from "../markdown.js";
import { isCorrect, isMulti } from "../engine/quiz.js";
import { askTutor } from "../tutor.js";
import { track } from "../analytics.js";

const KEYS = "ABCDEFGH";
const strip = (s) => md(s || "").replace(/^<p>|<\/p>\s*$/g, "");

// Plain-text flattening for the tutor prompt: drop trivial markdown so the
// question reads naturally in chat (no HTML, no ``` fences, no **/`/# marks).
const plain = (s) => String(s == null ? "" : s)
  .replace(/```[\w-]*\n?/g, "").replace(/```/g, "")   // fenced code blocks
  .replace(/`([^`]+)`/g, "$1")                          // inline code
  .replace(/\*\*([^*]+)\*\*/g, "$1")                    // bold
  .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")            // italic
  .replace(/^\s*#{1,6}\s+/gm, "")                        // headings
  .replace(/\s+/g, " ").trim();

// Compose the "explain the why" message from a revealed question: the stem,
// each option lettered + marked (correct answer / my pick), and the ask.
function tutorWhyMessage(q, chosenIds) {
  const chosen = new Set(chosenIds || []);
  const lines = (q.options || []).map((o, i) => {
    const marks = [o.correct ? "correct answer" : null, chosen.has(o.id) ? "my pick" : null].filter(Boolean);
    return `${KEYS[i]}. ${plain(o.text)}${marks.length ? `  [${marks.join(", ")}]` : ""}`;
  });
  return [
    "I just answered this exam question and want to understand the why in plain terms.",
    "",
    `Question: ${plain(q.stem)}`,
    "",
    "Options:",
    ...lines,
    "",
    "Explain why the correct answer is right — and, if I picked wrong, why my choice is a tempting distractor.",
  ].join("\n");
}

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
    // AI-native deep-link: hand the revealed question to the docked tutor.
    const picked = [...chosen];
    explainBox.appendChild(el("div", { class: "explain-ask" }, [
      el("button", { class: "ac-btn ask-why", type: "button", onClick: () => {
        track("tutor_deep_link", { qid: q.id });
        askTutor(tutorWhyMessage(q, picked));
      } }, [
        el("span", { class: "mono-label", text: "Still fuzzy?" }),
        " Ask the tutor why ",
        el("span", { class: "arr", text: "→" }),
      ]),
    ]));
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
