// Admin console (#/admin — PRD-ADMIN-CONSOLE S6). Tabs: Users · Payments ·
// Content. Gated on role from GET /api/me — a non-admin (or signed-out) sees a
// polite wall, never the console. All writes go through the role-gated
// /api/admin/* API; role changes are owner-only (enforced server-side).
import { el, clear } from "../ui.js";
import { section } from "./_chrome.js";
import { adminApi, ROLES, isAdminRole } from "../admin/console.js";

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(); } catch { return "—"; } };

function wall(title, msg) {
  return el("div", {}, [section(
    el("h1", { style: { fontSize: "clamp(28px,4vw,44px)" }, text: title }),
    el("p", { class: "lede muted", style: { marginTop: "14px" }, text: msg }),
    el("a", { class: "ac-btn", href: "#/", style: { marginTop: "18px" } }, ["← Back to the Academy"]),
  )]);
}

export async function adminView() {
  const me = await adminApi.me();
  if (me.status === 0) return wall("Admin", "Sign in to reach the admin console.");
  if (!me.data || !isAdminRole(me.data.role)) return wall("Not authorized", "This area is for Academy admins only.");

  const root = el("div", {});
  const tabs = ["Users", "Payments", "Content"];
  let active = "Users";
  const panel = el("div", { style: { marginTop: "18px" } });
  const tabBar = el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "20px" } });

  const renderTab = async () => {
    clear(panel);
    panel.appendChild(el("p", { class: "muted", text: "Loading…" }));
    const node = active === "Users" ? await usersTab() : active === "Payments" ? await paymentsTab() : contentTab();
    clear(panel);
    panel.appendChild(node);
  };
  const paintTabs = () => {
    clear(tabBar);
    for (const t of tabs) {
      tabBar.appendChild(el("button", {
        type: "button",
        class: "ac-btn" + (t === active ? "" : " ghost"),
        onClick: () => { active = t; paintTabs(); renderTab(); },
      }, [t]));
    }
  };

  root.appendChild(section(
    el("h1", { style: { fontSize: "clamp(28px,4vw,44px)" }, text: "Admin console" }),
    el("p", { class: "mono-label", style: { marginTop: "8px", color: "var(--muted)" }, text: `Signed in as ${me.data.role}` }),
    tabBar,
    panel,
  ));
  paintTabs();
  renderTab();
  return root;
}

// ── Users ──────────────────────────────────────────────────────────────
async function usersTab() {
  const wrap = el("div", {});
  const search = el("input", { class: "claim-input", type: "text", placeholder: "Search by Clerk id…", "aria-label": "Search users", style: { maxWidth: "320px" } });
  const listEl = el("div", { style: { marginTop: "16px" } });
  const detail = el("div", { style: { marginTop: "16px" } });

  const load = async () => {
    clear(listEl);
    listEl.appendChild(el("p", { class: "muted", text: "Loading users…" }));
    const r = await adminApi.listUsers({ q: search.value.trim(), limit: 50 });
    clear(listEl);
    if (r.code) { listEl.appendChild(el("p", { class: "muted", text: `Couldn't load users (${r.code}).` })); return; }
    const users = r.data.users || [];
    listEl.appendChild(el("p", { class: "mono-label", style: { color: "var(--muted)" }, text: `${r.data.total} user(s)` }));
    const table = el("div", { style: { marginTop: "10px", display: "grid", gap: "6px" } });
    for (const u of users) {
      table.appendChild(el("button", {
        type: "button", class: "ac-row",
        style: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", alignItems: "center", textAlign: "left", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "10px", background: "transparent", cursor: "pointer" },
        onClick: () => openDetail(u.id),
      }, [
        el("span", { class: "mono", style: { fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis" }, text: u.clerkUserId }),
        el("span", { class: "mono-label", text: u.plan }),
        el("span", { class: "mono-label", style: { color: isAdminRole(u.role) ? "var(--accent)" : "var(--muted)" }, text: u.role }),
      ]));
    }
    listEl.appendChild(users.length ? table : el("p", { class: "muted", text: "No users match." }));
  };

  const openDetail = async (id) => {
    clear(detail);
    detail.appendChild(el("p", { class: "muted", text: "Loading…" }));
    const [ur, pr] = await Promise.all([adminApi.getUser(id), adminApi.getProgress(id)]);
    clear(detail);
    if (ur.code) { detail.appendChild(el("p", { class: "muted", text: `Couldn't load user (${ur.code}).` })); return; }
    const u = ur.data.user;
    const status = el("div", { class: "mono-label", style: { marginTop: "8px", minHeight: "18px" } });
    const roleSel = el("select", { class: "claim-input", style: { maxWidth: "160px" } }, ROLES.map((r) => el("option", { value: r, ...(r === u.role ? { selected: "" } : {}) }, [r])));
    const planIn = el("input", { class: "claim-input", type: "text", value: u.plan, style: { maxWidth: "160px" }, "aria-label": "Plan" });

    detail.appendChild(el("div", { style: { border: "1px solid var(--line)", borderRadius: "12px", padding: "16px", marginTop: "8px" } }, [
      el("div", { class: "serif", style: { fontSize: "18px" }, text: u.clerkUserId }),
      el("div", { class: "mono-label", style: { color: "var(--muted)", marginTop: "4px" }, text: `member since ${fmtDate(u.createdAt)} · ${ur.data.counts.progress} answers · ${ur.data.counts.mocks} mocks` }),
      pr.data ? el("div", { class: "mono-label", style: { marginTop: "6px" }, text: `streak ${pr.data.streak.current} (best ${pr.data.streak.best})` }) : null,
      el("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end", marginTop: "14px" } }, [
        el("label", { class: "mono-label" }, ["Role", roleSel]),
        el("label", { class: "mono-label" }, ["Plan", planIn]),
        el("button", { type: "button", class: "ac-btn", onClick: async () => {
          status.textContent = "Saving…";
          const body = {};
          if (roleSel.value !== u.role) body.role = roleSel.value;
          if (planIn.value !== u.plan) body.plan = planIn.value;
          if (!Object.keys(body).length) { status.textContent = "No change."; return; }
          const res = await adminApi.patchUser(id, body);
          status.textContent = res.code ? `Failed: ${res.code}` : "Saved.";
          if (!res.code) load();
        } }, ["Save"]),
        el("button", { type: "button", class: "ac-btn ghost", style: { color: "var(--bad, #c33)" }, onClick: async () => {
          status.textContent = "Deleting…";
          const res = await adminApi.deleteUser(id);
          if (res.code) { status.textContent = `Failed: ${res.code}`; return; }
          status.textContent = "Deleted."; clear(detail); load();
        } }, ["Delete user"]),
      ]),
      status,
    ]));
  };

  search.addEventListener("input", () => { clearTimeout(usersTab._t); usersTab._t = setTimeout(load, 250); });
  wrap.appendChild(el("h2", { class: "serif-i", style: { fontSize: "22px", marginBottom: "10px" }, text: "Users" }));
  wrap.appendChild(search);
  wrap.appendChild(listEl);
  wrap.appendChild(detail);
  load();
  return wrap;
}

// ── Payments ───────────────────────────────────────────────────────────
async function paymentsTab() {
  const r = await adminApi.listUsers({ limit: 200 });
  const wrap = el("div", {}, [el("h2", { class: "serif-i", style: { fontSize: "22px" }, text: "Payments" })]);
  if (r.code) { wrap.appendChild(el("p", { class: "muted", text: `Couldn't load (${r.code}).` })); return wrap; }
  const byPlan = {};
  for (const u of r.data.users || []) byPlan[u.plan] = (byPlan[u.plan] || 0) + 1;
  wrap.appendChild(el("p", { class: "mono-label", style: { color: "var(--muted)", marginTop: "8px" }, text: "Plan distribution (first 200 users)" }));
  wrap.appendChild(el("div", { style: { marginTop: "10px", display: "grid", gap: "6px", maxWidth: "320px" } },
    Object.entries(byPlan).map(([plan, n]) => el("div", { style: { display: "flex", justifyContent: "space-between", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "8px" } }, [
      el("span", { class: "mono-label", text: plan }), el("span", { class: "mono", text: String(n) }),
    ]))));
  wrap.appendChild(el("p", { class: "muted", style: { marginTop: "16px", fontSize: "13px" }, text: "Stripe checkout + billing portal are wired (server/admin/billing.js); set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to activate. Subscriptions sync via the webhook → users.plan." }));
  return wrap;
}

// ── Content ────────────────────────────────────────────────────────────
function contentTab() {
  return el("div", {}, [
    el("h2", { class: "serif-i", style: { fontSize: "22px" }, text: "Content" }),
    el("p", { class: "muted", style: { marginTop: "8px", maxWidth: "60ch" }, text: "Media (videos/audio) upload lives on each track's Video hub — open a track → Videos, and the Upload control appears on every slot for admins." }),
    el("a", { class: "ac-btn", href: "#/", style: { marginTop: "12px" } }, ["Browse tracks →"]),
    el("p", { class: "muted", style: { marginTop: "16px", fontSize: "13px" }, text: "In-app lesson/question editing (draft → approve → publish) lands with PRD-CONTENT-LIFECYCLE; today text content is authored in git + published via the content pipeline." }),
  ]);
}
