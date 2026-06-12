// Full mock exam — mirrors the real format: N questions, hard countdown,
// closed-book single-question view with a jump grid, 1000-scale scoring,
// per-domain breakdown, and a full reviewable answer key.
import { el, clear, seal, fmtTime } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { url } from "../router.js";
import { buildMock, scoreMock } from "../engine/exam.js";
import { questionCard } from "./question.js";

function examHistory(store) {
  const ex = store.s.exams || [];
  if (!ex.length) return null;
  return el("div", { class: "panel", style: { marginTop: "30px" } }, [
    el("h3", { text: "Your attempts" }),
    el("div", { class: "stack-8" }, ex.slice().reverse().slice(0, 6).map((e) =>
      el("div", { class: "row", style: { justifyContent: "space-between" } }, [
        el("span", { class: "mono", text: `${e.scaled} / 1000` }),
        el("span", { class: "mono-label", text: e.passed ? "Pass" : "Below" }),
        el("span", { class: "mono-label", text: `${e.correct}/${e.total}` }),
      ])
    )),
  ]);
}

export function examView(ctx) {
  const { track, store } = ctx;
  const v = track.vendorId, t = track.trackId;
  const spec = track.exam || {};
  const root = el("div", {});
  let activeTimer = null;
  const stopTimer = () => { if (activeTimer) { clearInterval(activeTimer); activeTimer = null; } };

  function startScreen() {
    stopTimer();
    clear(root);
    root.appendChild(trackHeader(track, "exam"));
    root.appendChild(section(
      el("span", { class: "mono-label", text: "Closed-book · proctored-style" }),
      el("h1", { style: { fontSize: "clamp(30px,5vw,52px)", marginTop: "8px" }, text: "Mock exam" }),
      el("p", { class: "lede muted", style: { maxWidth: "64ch", marginTop: "14px" }, text:
        `${spec.questionCount} questions · ${spec.durationMinutes} minutes · ${spec.passingScore}/${spec.scoreScale} to pass. ${spec.scenariosPresented} of ${spec.scenarioPool} scenarios are drawn at random — exactly like the real exam. The clock runs the moment you begin; unanswered counts as wrong.` }),
      el("div", { class: "row", style: { marginTop: "26px" } }, [
        el("button", { class: "ac-btn ac-btn-solid", type: "button", onClick: begin }, ["Begin exam ", el("span", { class: "arr", text: "→" })]),
        el("a", { class: "ac-btn", href: "#" + url.readiness(v, t) }, ["My readiness"]),
      ]),
      examHistory(store),
    ));
    window.scrollTo({ top: 0 });
  }

  function begin() {
    const mock = buildMock(track, store);
    if (!mock.total) { clear(root); root.appendChild(trackHeader(track, "exam")); root.appendChild(section(el("p", { text: "No questions available yet — add content first." }))); return; }
    runExam(mock);
  }

  function runExam(mock) {
    const answers = {};
    let cur = 0, remaining = mock.durationSec;

    const timerEl = el("span", { class: "timer", text: fmtTime(remaining) });
    const pgrI = el("i", {});
    const countEl = el("span", { class: "count", text: `1 / ${mock.total}` });
    const submitBtn = el("button", { class: "ac-btn", type: "button" }, ["Submit"]);
    submitBtn.addEventListener("click", () => finishExam(mock, answers));
    const bar = el("div", { class: "exam-bar" }, [timerEl, el("div", { class: "pgr" }, [pgrI]), countEl, submitBtn]);

    const qHost = el("div", {});
    const gridNav = el("div", { class: "exam-grid-nav" }, mock.items.map((_q, i) => {
      const b = el("button", { type: "button", text: String(i + 1) });
      b.addEventListener("click", () => { cur = i; renderQ(); });
      return b;
    }));
    const navRow = el("div", { class: "row", style: { justifyContent: "space-between", marginTop: "20px" } }, [
      el("button", { class: "ac-btn", type: "button", onClick: () => { cur = Math.max(0, cur - 1); renderQ(); } }, ["← Prev"]),
      el("button", { class: "ac-btn ac-btn-solid", type: "button", onClick: () => { if (cur < mock.total - 1) { cur++; renderQ(); } else finishExam(mock, answers); } }, ["Next →"]),
    ]);

    function updateNav() {
      [...gridNav.children].forEach((b, i) => b.classList.toggle("answered", (answers[mock.items[i].id] || []).length > 0));
    }
    function renderQ() {
      const q = mock.items[cur];
      clear(qHost);
      qHost.appendChild(questionCard(q, { reveal: false, selected: answers[q.id] || [], onAnswer: (chosen) => { answers[q.id] = chosen; updateNav(); } }));
      countEl.textContent = `${cur + 1} / ${mock.total}`;
      pgrI.style.width = Math.round(((cur + 1) / mock.total) * 100) + "%";
      [...gridNav.children].forEach((b, i) => b.classList.toggle("cur", i === cur));
      updateNav();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    activeTimer = setInterval(() => {
      remaining--;
      timerEl.textContent = fmtTime(remaining);
      timerEl.classList.toggle("low", remaining < 300);
      if (remaining <= 0) finishExam(mock, answers);
    }, 1000);

    clear(root);
    root.appendChild(bar);
    root.appendChild(el("div", { class: "section" }, [el("div", { class: "wrap" }, [
      qHost, navRow,
      el("div", { class: "mono-label", style: { margin: "26px 0 8px" }, text: "Jump to question" }), gridNav,
    ])]));
    renderQ();
  }

  function finishExam(mock, answers) {
    stopTimer();
    const res = scoreMock(track, mock.items, answers);
    mock.items.forEach((q) => {
      const cIds = q.options.filter((o) => o.correct).map((o) => o.id).sort();
      const a = (answers[q.id] || []).slice().sort();
      const ok = cIds.length === a.length && cIds.every((id, i) => id === a[i]);
      store.recordAnswer(q.id, ok, q.domainId);
    });
    store.pushExam({ scaled: res.scaled, passed: res.passed, correct: res.correct, total: res.total, perDomain: res.perDomain, count: mock.total });
    showResults(mock, answers, res);
  }

  function showResults(mock, answers, res) {
    clear(root);
    root.appendChild(trackHeader(track, "exam"));
    const sealGrade = res.passed ? (res.scaled >= 800 ? "A+" : "A") : "—";
    const dom = el("div", { class: "mastery" }, track.domains.map((d) => {
      const pd = res.perDomain[d.id];
      const pct = pd ? Math.round((pd.correct / pd.total) * 100) : 0;
      return el("div", { class: "m-row" }, [
        el("div", { class: "lab" }, [el("span", { class: "mono-label", text: d.code || "" }), el("span", { class: "serif", style: { fontSize: "17px" }, text: d.name })]),
        el("span", { class: "mono", text: pd ? `${pd.correct}/${pd.total}` : "—" }),
        el("div", { class: "m-bar" }, [el("i", { style: { width: pct + "%" } })]),
      ]);
    }));
    root.appendChild(section(
      el("div", { class: "ready-hero" }, [
        seal(sealGrade, res.passed ? "Passed" : "Below pass", "lg"),
        el("div", { class: "verdict" }, [
          el("span", { class: "mono-label", text: "Mock result" }),
          el("h2", { text: `${res.scaled} / 1000 — ${res.passed ? "pass" : "below the 720 line"}` }),
          el("p", { text: res.passed ? "You cleared the bar. A+ needs 800+ with the mastery to match — keep sitting full mocks under time." : "Not yet. Review every miss below, rebuild the weak domains, and re-sit. The real exam is closed-book and unforgiving." }),
          mock.capped ? el("p", { class: "muted", style: { fontSize: "13px" }, text: `Drawn from ${mock.total} available questions; the bank is still growing toward the full ${spec.questionCount}.` }) : null,
        ]),
      ]),
      el("h3", { class: "serif-i", style: { fontSize: "24px", margin: "36px 0 12px" }, text: "By domain" }),
      dom,
      el("div", { class: "row", style: { marginTop: "24px" } }, [
        el("button", { class: "ac-btn ac-btn-solid", type: "button", onClick: begin }, ["New exam"]),
        el("a", { class: "ac-btn", href: "#" + url.readiness(v, t) }, ["Readiness →"]),
      ]),
      el("h3", { class: "serif-i", style: { fontSize: "24px", margin: "44px 0 12px" }, text: "Review — every question, with the why" }),
      el("div", { class: "stack-24" }, mock.items.map((q) => questionCard(q, { reveal: true, showExplain: true, selected: answers[q.id] || [] }))),
    ));
    window.scrollTo({ top: 0 });
  }

  startScreen();
  return root;
}
