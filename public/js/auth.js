// Academy auth seam (PRD-U1 S1) — the ONLY module that touches Clerk.
// Views and services consume these exports; nothing else may import or
// reference the Clerk global. Sign-in is optional and additive, never a wall.
//
// Config comes from window.ACADEMY_AUTH (public/auth-config.js, hydrated from
// CLERK_PUBLISHABLE_KEY at boot by server.js — hydrateAuthConfig, the same
// pattern as chat-config.js). When the global is null/absent (static hosts,
// unconfigured deploys) every export is an inert no-op: no Clerk script, no
// network, no console noise — the SPA renders exactly as a pre-U1 deploy.
//
// ClerkJS loads per Clerk's standalone (no-bundler) script install
// (https://clerk.com/docs/quickstarts/javascript): inject
//   <script async crossorigin="anonymous"
//           data-clerk-publishable-key="pk_…"
//           src="https://<frontend-api>/npm/@clerk/clerk-js@5/dist/clerk.browser.js">
// then `await window.Clerk.load()`. The frontend-api host is decoded from the
// publishable key the way @clerk/shared's parsePublishableKey does: strip the
// pk_test_/pk_live_ prefix, base64-decode, require and drop the trailing "$".
// Pinned to the @5 major deliberately — one stable script; the docs' newer @6
// variant adds a second @clerk/ui bundle + an internal ctor handshake that has
// no business on a dependency-free page. Revisit the pin when @6 settles.
//
// No Subresource Integrity on the script tag — considered and rejected:
// Clerk serves the bundle from THIS instance's frontend-API host and rolls
// patch releases inside the pinned major, so a fixed integrity hash would
// break sign-in on Clerk's next patch. Clerk's own documented install omits
// SRI for the same reason; crossorigin="anonymous" + the per-instance host
// + our degrade-to-signed-out failure policy are the mitigations.
//
// Failure policy (PRD-U1 risk list): if the CDN script fails or Clerk.load()
// rejects, the SPA degrades to signed-out silently — one console.warn, no
// throw; every export keeps its contract and returns the signed-out shape.

const listeners = new Set();
let clerk = null; // window.Clerk, only once load() has resolved
let ready = false; // true after a successful load — gates every Clerk call
let started = false; // initAuth() is idempotent
let snapshot = null; // { id, name, email, imageUrl } | null — immutable, replaced whole

const config = () => (typeof window !== "undefined" && window.ACADEMY_AUTH) || null;

/** True when this deploy shipped a publishable key (auth-config.js). */
export function isConfigured() {
  const c = config();
  return !!(c && typeof c.publishableKey === "string" && c.publishableKey);
}

// pk_test_/pk_live_ + base64("<frontend-api-host>$") → host, else null.
function frontendApiFromKey(key) {
  if (!/^pk_(test|live)_/.test(key)) return null;
  try {
    const decoded = atob(key.split("_")[2] || "");
    if (!decoded.endsWith("$")) return null;
    const host = decoded.slice(0, -1);
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch (_) {
    return null;
  }
}

// Normalize a Clerk user resource to the tiny shape the SPA consumes.
// `id` is the clerk_user_id (PRD-U2): the Spine's account-deletion endpoint
// demands it back as the X-Confirm-Account-Deletion header — identity still
// only ever crosses this seam, never a second Clerk touchpoint.
function toSnapshot(clerkUser) {
  if (!clerkUser) return null;
  return {
    id: clerkUser.id || "",
    name: clerkUser.fullName || clerkUser.firstName || "",
    email: (clerkUser.primaryEmailAddress && clerkUser.primaryEmailAddress.emailAddress) || "",
    imageUrl: clerkUser.imageUrl || "",
  };
}

function notify() {
  for (const cb of listeners) {
    try {
      cb(user());
    } catch (e) {
      console.error("[auth] onAuthChange listener failed:", e);
    }
  }
}

// Recompute the snapshot from Clerk; emit only on a real change so renders
// stay quiet across Clerk's frequent internal listener ticks.
function refresh(emit) {
  const next = toSnapshot(clerk && clerk.user);
  const changed = JSON.stringify(next) !== JSON.stringify(snapshot);
  snapshot = next;
  if (emit && changed) notify();
}

function injectClerkScript(host, key) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.setAttribute("data-clerk-publishable-key", key);
    s.src = `https://${host}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
    s.addEventListener("load", resolve, { once: true });
    s.addEventListener("error", () => reject(new Error("clerk-js script failed to load")), { once: true });
    document.head.appendChild(s);
  });
}

async function boot() {
  const key = config().publishableKey;
  const host = frontendApiFromKey(key);
  if (!host) throw new Error("publishable key unreadable");
  await injectClerkScript(host, key);
  await window.Clerk.load();
  clerk = window.Clerk;
  ready = true;
  clerk.addListener(() => refresh(true)); // session/user changes → UI
  refresh(false); // compute the initial snapshot silently…
  notify(); // …then broadcast exactly once, signed-in or -out
}

/**
 * Kick off Clerk (async, never blocks first paint). Idempotent; a no-op when
 * unconfigured. All failures degrade to signed-out with a single warn.
 */
export function initAuth() {
  if (started || !isConfigured()) return;
  started = true;
  boot().catch((e) => {
    console.warn("[auth] sign-in unavailable — continuing signed-out:", (e && e.message) || e);
  });
}

/** Current user ({ id, name, email, imageUrl }) or null when signed out. */
export function user() {
  return snapshot ? { ...snapshot } : null;
}

/**
 * Fresh session JWT for the Spine (Clerk refreshes it internally), or null
 * when signed out / unconfigured / Clerk unavailable. Never throws.
 */
export async function getToken() {
  if (!ready || !clerk || !clerk.session) return null;
  try {
    return await clerk.session.getToken();
  } catch (_) {
    return null;
  }
}

/**
 * Subscribe to auth-state changes; cb(user|null) also fires immediately when
 * state is already known (late subscribers sync up). Returns unsubscribe.
 */
export function onAuthChange(cb) {
  listeners.add(cb);
  if (ready) {
    try {
      cb(user());
    } catch (e) {
      console.error("[auth] onAuthChange listener failed:", e);
    }
  }
  return () => listeners.delete(cb);
}

/** Open Clerk's sign-in modal (no navigation). No-op until Clerk is ready. */
export function openSignIn() {
  if (ready && clerk) { clerk.openSignIn(); return; }
  // Clerk is still loading. Dropping the click here is indistinguishable
  // from a broken button, so hold the intent and open the moment auth
  // answers — unless it answers with a session, in which case the person is
  // already signed in and a sign-in modal would be nonsense.
  const off = onAuthChange((u) => { off(); if (!u && clerk) clerk.openSignIn(); });
}

/**
 * Open Clerk's account modal — profile details, email addresses, password,
 * connected accounts, active sessions, MFA.
 *
 * Deliberately Clerk's own UI rather than forms of ours. Every field in there
 * is an identity operation with a verification flow behind it (a password
 * change re-authenticates, an email change round-trips a code, removing the
 * last connected account has to be refused), and hand-rolling those is how a
 * profile page becomes a way to lock yourself out. It also means the moment a
 * provider is enabled in the Clerk tenant it appears here with no code change.
 *
 * Note what this modal is NOT: the data rights. Export, erase-my-data and
 * delete-account are the Spine's (`public/js/sync/account.js`, §4.4) and stay
 * on the profile page, because they concern learner records this app owns —
 * Clerk only knows the identity, not the progress. Two different things that
 * would be confusing to merge.
 *
 * No-op until Clerk is ready, like every other export here.
 */
export function openUserProfile() {
  if (ready && clerk) clerk.openUserProfile();
}

/** Sign out; listeners fire with null. Safe to call in any state. */
export async function signOut() {
  if (!ready || !clerk) return;
  try {
    await clerk.signOut();
  } catch (e) {
    console.warn("[auth] sign-out failed:", (e && e.message) || e);
  }
}
