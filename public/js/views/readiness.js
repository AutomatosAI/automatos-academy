// Readiness dashboard — the A+ verdict, per-domain mastery, review queue,
// exam history, and the honest "what's missing to qualify". Skills tracks
// (no exam) get the progress/completion variant instead — same route.
import { el, seal, ring } from "../ui.js";
import { trackHeader, section } from "./_chrome.js";
import { url } from "../router.js";
import { verdict, domainStats } from "../engine/readiness.js";
import { isSkillsTrack, completion } from "../engine/certificate.js";
import { claimPanel } from "./certificate.js";
import { trackOnce } from "../analytics.js";
import { downloadBackup, importBackup } from "../progress-io.js";
import { noteRestore } from "../sync/backfill.js";

const domGrade = (pct) => (pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 55 ? "C" : pct >= 40 ? "D" : "F");
const gradeVar = (g) => `var(--grade-${g === "A+" ? "aplus" : g === "A" ? "a" : g === "B" ? "b" : g === "C" ? "c" : g === "D" ? "d" : "f"})`;

// Local-first data controls: back up / restore all progress (works signed-out,
// no account needed — signed-in learners additionally get server sync, PRD-U2)
// and a two-click reset. Backup carries EVERY track, not just this one.
function dataControls(store, backTo) {
  const msg = el("span", { class: "mono-label", style: { alignSelf: "center" } });
  const reload = () => { location.hash = backTo; window.dispatchEvent(new HashChangeEvent("hashchange")); };

  const reset = el("button", { class: "ac-btn", type: "button", style: { borderColor: "var(--bad)", color: "var(--bad)" } }, ["Reset my progress"]);
  let armed = false;
  reset.addEventListener("click", () => {
    if (!armed) { armed = true; reset.textContent = "Click again to erase everything"; return; }
    store.reset();
    reload();
  });

  const backup = el("button", { class: "ac-btn", type: "button", onClick: () => { downloadBackup(); msg.textContent = "Backup downloaded ✓"; } }, ["Back up my progress"]);

  const file = el("input", { type: "file", accept: "application/json,.json", style: { display: "none" } });
  file.addEventListener("change", () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = importBackup(String(r.result));
      msg.textContent = res.ok ? `Restored ${res.restored} item${res.restored === 1 ? "" : "s"} — reloading…` : res.error;
      // PRD-U2 S2: a restore while signed in re-offers backfill for the
      // restored state (and resets the reconcile cursor). Inert signed-out.
      if (res.ok) { noteRestore(); setTimeout(reload, 700); }
    };
    r.readAsText(f);
    file.value = "";
  });
  const restore = el("button", { class: "ac-btn", type: "button", onClick: () => file.click() }, ["Restore"]);

  return el("div", { class: "row", style: { gap: "10px", flexWrap: "wrap", alignItems: "center" } }, [backup, restore, reset, file, msg]);
}

// Skills-track progress: modules done + the capstone are the whole story —
// no grade, no gate (PRD-S1-APA §2 / PRD-B1 §2 by design).
function progressView(ctx) {
  const { track, store } = ctx;
  const v = track.vendorId, t = track.trackId;
  const comp = completion(track, store, verdict);
  const pct = Math.round(comp.pct * 100);

  const rows = track.domains.map((d) => {
    const st = domainStats(d, store);
    const p = Math.round(st.coverage * 100);
    return el("div", { class: "m-row" }, [
      el("div", { class: "lab" }, [el("span", { class: "mono-label", text: d.code || "" }), el("span", { class: "serif", style: { fontSize: "18px" }, text: d.name })]),
      el("span", { class: "g", text: `${st.lessonsDone}/${st.lessonsTotal}` }),
      el("div", { class: "m-bar" }, [el("i", { style: { width: p + "%" } })]),
    ]);
  });

  return el("div", {}, [
    trackHeader(track, "readiness"),
    section(
      el("div", { class: "ready-hero" }, [
        ring(pct),
        el("div", { class: "verdict" }, [
          el("span", { class: "mono-label", text: "Your progress" }),
          el("h2", { text: comp.complete ? "Complete — nice work." : `${comp.done} of ${comp.total} lessons done.` }),
          el("p", { text: comp.complete
            ? "Every module is done. Claim your completion badge below — and keep the capstone artifact where you can show it."
            : "No exam, no grade — this track is done when every module's work is done. The capstone is the real certificate." }),
        ]),
      ]),
      claimPanel(track, comp),
      el("h3", { class: "serif-i", style: { fontSize: "24px", margin: "40px 0 14px" }, text: "Progress by module group" }),
      el("div", { class: "mastery" }, rows),
      el("div", { class: "row", style: { marginTop: "48px", flexWrap: "wrap", gap: "16px", justifyContent: "space-between" } }, [
        el("a", { class: "mono-label", style: { alignSelf: "center" }, href: "#" + url.track(v, t), text: "← Back to curriculum" }),
        dataControls(store, url.readiness(v, t)),
      ]),
    ),
  ]);
}

export function readinessView(ctx) {
  if (isSkillsTrack(ctx.track)) return progressView(ctx);
  const { track, store } = ctx;
  const v = track.vendorId, t = track.trackId;
  const r = verdict(track, store);
  if (r.qualified) trackOnce(`aplus:${v}/${t}`, "readiness_a_plus", { track: t });
  const masteryPct = Math.round(r.overall.mastery * 100);
  const best = r.bestMock;

  const rows = track.domains.map((d) => {
    const st = r.overall.perDomain[d.id];
    const pct = Math.round(st.mastery * 100);
    const g = domGrade(pct);
    return el("div", { class: "m-row" }, [
      el("div", { class: "lab" }, [el("span", { class: "mono-label", text: d.code || "" }), el("span", { class: "serif", style: { fontSize: "18px" }, text: d.name })]),
      el("span", { class: "g", style: { color: gradeVar(g) }, text: `${pct}% · ${g}` }),
      el("div", { class: "m-bar" }, [el("i", { style: { width: pct + "%" } })]),
    ]);
  });

  const weakHref = r.weakest ? url.quiz(v, t, r.weakest.id) : url.exam(v, t);

  return el("div", {}, [
    trackHeader(track, "readiness"),
    section(
      el("div", { class: "ready-hero" }, [
        seal(r.grade, r.qualified ? "Qualified" : "Readiness", "lg"),
        el("div", { class: "verdict" }, [
          el("span", { class: "mono-label", text: "Your grade" }),
          el("h2", { text: r.headline }),
          el("p", { text: r.next }),
          r.reasons.length ? el("ul", { class: "prose why", style: { maxWidth: "60ch" } }, r.reasons.map((x) => el("li", { text: x }))) : null,
          el("div", { class: "row", style: { marginTop: "18px" } }, [
            el("a", { class: "ac-btn ac-btn-solid", href: "#" + weakHref }, [r.weakest ? `Drill ${r.weakest.name} →` : "Take a mock →"]),
            el("a", { class: "ac-btn", href: "#" + url.exam(v, t) }, ["Mock exam"]),
          ]),
        ]),
      ]),

      claimPanel(track, { kind: "exam", complete: r.qualified }),

      el("div", { class: "panel", style: { marginTop: "34px" } }, [
        el("div", { class: "stat-row" }, [
          el("div", { class: "s" }, [el("b", { text: masteryPct + "%" }), el("span", { class: "mono-label", text: "Weighted mastery" })]),
          el("div", { class: "s" }, [el("b", { text: best ? `${best.scaled}` : "—" }), el("span", { class: "mono-label", text: `Best mock / ${r.scale}` })]),
          el("div", { class: "s" }, [el("b", { text: String(r.due) }), el("span", { class: "mono-label", text: "Review due" })]),
          el("div", { class: "s" }, [el("b", { text: (store.s.exams || []).length + "" }), el("span", { class: "mono-label", text: "Mocks sat" })]),
        ]),
      ]),

      el("h3", { class: "serif-i", style: { fontSize: "24px", margin: "40px 0 14px" }, text: "Mastery by domain" }),
      el("p", { class: "muted", style: { fontSize: "13px", marginBottom: "16px" }, text: "Blueprint-weighted. Gated by how much of the bank you've actually attempted — one lucky answer can't fake mastery." }),
      el("div", { class: "mastery" }, rows),

      el("div", { class: "row", style: { marginTop: "48px", flexWrap: "wrap", gap: "16px", justifyContent: "space-between" } }, [
        el("a", { class: "mono-label", style: { alignSelf: "center" }, href: "#" + url.track(v, t), text: "← Back to curriculum" }),
        dataControls(store, url.readiness(v, t)),
      ]),
    ),
  ]);
}
