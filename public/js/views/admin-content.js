// Admin console — Content tab (PRD-CONTENT-LIFECYCLE / ADMIN-CONSOLE S5). The
// human approval surface for the text write-back plane: review the drafts
// Automatos (or an admin) proposed, approve one to serve it live over the
// published content (no redeploy), retire a live override, or paste a change
// by hand. Media (video/audio) upload stays on each track's Video hub.

import { el, clear } from "../ui.js";
import { contentApi, scopeLabel, REJECT_REASONS } from "../admin/content.js";

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(); } catch { return "—"; } };

export async function contentTab() {
  const wrap = el("div", {});
  const status = el("div", { class: "mono-label", style: { minHeight: "18px", marginTop: "6px" } });
  const setStatus = (t) => { status.textContent = t; };
  const batches = el("div", { style: { marginTop: "16px" } });
  const queue = el("div", { style: { marginTop: "16px" } });
  const live = el("div", { style: { marginTop: "22px" } });

  const loadBatches = async () => {
    clear(batches);
    const r = await contentApi.listBatches();
    if (!r.ok || !Array.isArray(r.batches) || !r.batches.length) return; // no factory output yet
    batches.appendChild(el("h3", { class: "mono-label", style: { color: "var(--muted)" }, text: `Factory batches — ${r.batches.length}` }));
    for (const b of r.batches) batches.appendChild(batchCard(b, { onDone: load, setStatus }));
  };

  const load = async () => {
    clear(queue); clear(live);
    await loadBatches();
    queue.appendChild(el("p", { class: "muted", text: "Loading drafts…" }));
    const r = await contentApi.listDrafts();
    clear(queue);
    if (r.status === 0) { queue.appendChild(el("p", { class: "muted", text: "Sign in as an admin to review drafts." })); return; }
    if (!r.ok || !Array.isArray(r.drafts)) {
      queue.appendChild(el("p", { class: "muted", text: `Couldn't load drafts (${r.error || r.status}).` }));
      return;
    }
    const pending = r.drafts.filter((d) => d.status === "pending");
    const approved = r.drafts.filter((d) => d.status === "approved");

    queue.appendChild(el("h3", { class: "mono-label", style: { color: "var(--muted)" }, text: `Review queue — ${pending.length} pending` }));
    if (!pending.length) queue.appendChild(el("p", { class: "muted", style: { marginTop: "8px" }, text: "Nothing awaiting review." }));
    for (const d of pending) queue.appendChild(draftCard(d, { pending: true, onDone: load, setStatus }));

    live.appendChild(el("h3", { class: "mono-label", style: { color: "var(--muted)" }, text: `Live overrides — ${approved.length} serving` }));
    if (!approved.length) live.appendChild(el("p", { class: "muted", style: { marginTop: "8px" }, text: "No approved drafts are overriding content." }));
    for (const d of approved) live.appendChild(draftCard(d, { pending: false, onDone: load, setStatus }));
  };

  wrap.appendChild(el("h2", { class: "serif-i", style: { fontSize: "22px" }, text: "Content" }));
  wrap.appendChild(el("p", { class: "muted", style: { marginTop: "8px", maxWidth: "64ch" }, text:
    "Automatos (and you) propose lesson/question/domain changes here as drafts; approving one serves it live over the published content with no redeploy. Media (videos/audio) upload lives on each track's Video hub." }));
  wrap.appendChild(status);
  wrap.appendChild(batches);
  wrap.appendChild(queue);
  wrap.appendChild(live);
  wrap.appendChild(proposeForm(load, setStatus));
  wrap.appendChild(el("p", { class: "muted", style: { marginTop: "22px", fontSize: "13px" }, text:
    "Git stays the offline canonical; approved drafts are the live override. A rejected proposal — or a retired live override — drops back to the published content at once." }));
  await load();
  return wrap;
}

/** LA-8 — one factory batch: what it cost to review, and what §6 reads.
 *  The reject rate is over DECIDED cards and is shown as "—" (not 0%) while
 *  nothing has been decided, because a clean sheet and an empty sheet are
 *  different things and the ladder graduates playbooks on this number. */
function batchCard(b, { onDone, setStatus }) {
  const pct = b.rejectRate == null ? "—" : `${Math.round(b.rejectRate * 100)}%`;
  const provenance = [b.playbook, b.format].filter(Boolean).join(" · ") || "unattributed";

  const approveAll = el("button", {
    type: "button",
    class: "ac-btn",
    disabled: b.pending === 0,
    onClick: async () => {
      setStatus(`Approving ${b.pending} in ${b.batchId}…`);
      const r = await contentApi.approveBatch(b.batchId);
      if (!r.ok) { setStatus(`Failed: ${r.error || r.status}`); return; }
      setStatus(`Approved ${r.approved} ✓`); onDone();
    },
  }, [b.pending ? `Approve all pending (${b.pending})` : "Nothing pending"]);

  return el("div", { style: { border: "1px solid var(--line)", borderRadius: "12px", padding: "12px 14px", marginTop: "10px" } }, [
    el("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "baseline" } }, [
      el("span", { class: "mono", style: { fontSize: "14px" }, text: b.batchId }),
      el("span", { class: "mono-label", style: { color: "var(--muted)" }, text: provenance }),
    ]),
    el("div", { class: "mono-label", style: { color: "var(--muted)", marginTop: "6px" }, text:
      `${b.total} cards · ${b.pending} pending · ${b.approved} approved · ${b.rejected} rejected · reject rate ${pct}` }),
    // §6: a single wrong-fact reject demotes this playbook×format to T0, so
    // it is called out rather than buried in the rejected count.
    b.wrongFact > 0
      ? el("div", { class: "mono-label", style: { color: "var(--bad, #c33)", marginTop: "4px" }, text:
          `${b.wrongFact} wrong-fact — this playbook is back to manual review` })
      : null,
    el("div", { style: { marginTop: "10px" } }, [approveAll]),
  ]);
}

function draftCard(d, { pending, onDone, setStatus }) {
  const body = el("pre", { class: "mono", style: {
    display: "none", whiteSpace: "pre-wrap", maxHeight: "280px", overflow: "auto",
    marginTop: "10px", fontSize: "12px", padding: "10px", border: "1px solid var(--line)", borderRadius: "8px",
  } });
  let shown = false;
  const view = el("button", { type: "button", class: "ac-btn ghost", onClick: async () => {
    shown = !shown;
    if (shown && !body.textContent) {
      body.textContent = "Loading…"; body.style.display = "block";
      const r = await contentApi.getDraft(d.id);
      body.textContent = (r.draft && r.draft.canonical) || `(couldn't load: ${r.error || r.status})`;
    } else {
      body.style.display = shown ? "block" : "none";
    }
  } }, ["View JSON"]);

  const act = async (call, label) => {
    setStatus(`${label}…`);
    const r = await call();
    if (!r.ok) { setStatus(`Failed: ${r.error || r.status}`); return; }
    setStatus(`${label} ✓`); onDone();
  };

  const buttons = [];
  if (pending) {
    buttons.push(el("button", { type: "button", class: "ac-btn", onClick: () => act(() => contentApi.approve(d.id), "Approved") }, ["Approve"]));
    // LA-8 — the reason IS the reject button. A modal asking "why?" after the
    // fact is the thing that makes a 25-card batch take an evening, and a
    // reason typed as prose cannot be counted by §6.
    for (const r of REJECT_REASONS) {
      buttons.push(el("button", {
        type: "button",
        class: "ac-btn ghost",
        title: `Reject — ${r.label}`,
        style: r.value === "wrong-fact" ? { color: "var(--bad, #c33)" } : {},
        onClick: () => act(() => contentApi.reject(d.id, r.value), `Rejected (${r.label})`),
      }, [`✕ ${r.label}`]));
    }
  } else {
    buttons.push(el("button", { type: "button", class: "ac-btn ghost", style: { color: "var(--bad, #c33)" }, onClick: () => act(() => contentApi.reject(d.id), "Retired") }, ["Retire (revert to published)"]));
  }
  buttons.push(view);

  return el("div", { style: { border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", marginTop: "10px" } }, [
    el("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "baseline" } }, [
      el("span", { class: "serif", style: { fontSize: "16px" }, text: d.title || scopeLabel(d) }),
      el("span", { class: "mono-label", style: { color: "var(--muted)" }, text: `${d.source} · ${d.bytes}b · ${fmtDate(d.createdAt)}` }),
    ]),
    el("div", { class: "mono-label", style: { color: "var(--muted)", marginTop: "4px" }, text: scopeLabel(d) }),
    d.note ? el("p", { class: "muted", style: { marginTop: "6px", fontSize: "13px" }, text: d.note }) : null,
    el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" } }, buttons),
    body,
  ]);
}

function proposeForm(onDone, setStatus) {
  const details = el("details", { style: { marginTop: "22px" } });
  details.appendChild(el("summary", { class: "mono-label", style: { cursor: "pointer" }, text: "Propose a change (paste JSON) ▸" }));

  const kind = el("select", { class: "claim-input", style: { maxWidth: "180px" }, "aria-label": "Scope kind" },
    ["domain", "track", "manifest", "paths", "levels", "podcasts"].map((k) => el("option", { value: k }, [k])));
  const vendor = el("input", { class: "claim-input", placeholder: "vendorId", "aria-label": "vendorId", style: { maxWidth: "150px" } });
  const track = el("input", { class: "claim-input", placeholder: "trackId", "aria-label": "trackId", style: { maxWidth: "150px" } });
  const domain = el("input", { class: "claim-input", placeholder: "domainId", "aria-label": "domainId", style: { maxWidth: "150px" } });
  const note = el("input", { class: "claim-input", placeholder: "note (optional)", "aria-label": "note", style: { maxWidth: "320px" } });
  const canonical = el("textarea", { class: "claim-input", placeholder: '{ "id": "d1", "name": "…", "lessons": [ … ] }', rows: "8",
    "aria-label": "Canonical JSON", style: { width: "100%", fontFamily: "monospace", fontSize: "12px", marginTop: "8px" } });
  const out = el("div", { class: "mono-label", style: { minHeight: "18px", marginTop: "6px" } });

  const submit = el("button", { type: "button", class: "ac-btn", onClick: async () => {
    out.textContent = "Submitting…";
    const bodyReq = { scopeKind: kind.value, canonical: canonical.value, source: "admin" };
    if (vendor.value.trim()) bodyReq.vendorId = vendor.value.trim();
    if (track.value.trim()) bodyReq.trackId = track.value.trim();
    if (domain.value.trim()) bodyReq.domainId = domain.value.trim();
    if (note.value.trim()) bodyReq.note = note.value.trim();
    const r = await contentApi.writeBack(bodyReq);
    const okStatus = r.status === 200 || r.status === 201;
    if (!okStatus) { out.textContent = `Failed: ${r.error || r.status}${r.note ? ` — ${r.note}` : ""}`; return; }
    out.textContent = r.deduped ? "Already queued (identical draft)." : `Draft #${r.draft && r.draft.id} created — review it above.`;
    canonical.value = "";
    if (typeof setStatus === "function") setStatus("");
    onDone();
  } }, ["Submit draft"]);

  details.appendChild(el("div", { style: { marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" } }, [kind, vendor, track, domain, note]));
  details.appendChild(canonical);
  details.appendChild(el("div", { style: { marginTop: "8px" } }, [submit]));
  details.appendChild(out);
  return details;
}
