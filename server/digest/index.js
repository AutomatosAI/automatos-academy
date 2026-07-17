// Digest assembly (PRD-DIGEST) — only ever imported when DIGEST_ENABLED=true
// (server.js dynamic-imports it, the Spine/Wire posture): the default boot
// stays byte-identical, and a half-configured mailer refuses to boot rather
// than limp.
//
// D-D1 (signed 2026-07-17): in-process weekly tick — a half-hourly check
// that only acts inside the send window (Sunday ≥18:00 UTC, D-D3). The
// ledger + advisory lock own correctness, so the trigger stays swappable
// (platform mission later = move the trigger, not the logic). Repeat ticks
// inside the window are cheap no-ops that double as crash-resume (US-D5).
import { createMailer } from "./mailer.js";
import { runDigest } from "./send.js";
import { registerDigestRoutes } from "./routes.js";

const TICK_MS = 30 * 60 * 1000;

/** Clerk is the address oracle (§4.2) — fetched at send time, never stored.
 *  Lazy import mirrors spine/auth.js: the SDK loads only when digesting. */
export function createClerkEmailFetcher(secretKey) {
  let clientPromise = null;
  return async function fetchEmail(clerkUserId) {
    if (!clientPromise) {
      clientPromise = import("@clerk/backend").then(({ createClerkClient }) => createClerkClient({ secretKey }));
    }
    const clerk = await clientPromise;
    const user = await clerk.users.getUser(clerkUserId);
    const primary = user.emailAddresses && user.emailAddresses.find((a) => a.id === user.primaryEmailAddressId);
    return (primary && primary.emailAddress) || (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress) || null;
  };
}

function inSendWindow(now) {
  return now.getUTCDay() === 0 && now.getUTCHours() >= 18; // Sunday evening UTC (D-D3)
}

export function mountDigest(app, { pool, getIndex, env = process.env }) {
  if (!pool) throw new Error("[digest] mountDigest requires the Spine's pg pool");
  const adminKey = env.DIGEST_ADMIN_KEY;
  if (!adminKey) throw new Error("[digest] DIGEST_ADMIN_KEY is required when DIGEST_ENABLED=true");
  const baseUrl = (env.ACADEMY_BASE_URL || "https://academy.automatos.app").replace(/\/+$/, "");

  const mailer = createMailer(env); // throws on missing SMTP_* (fail-loud)
  const fetchEmail = createClerkEmailFetcher(env.CLERK_SECRET_KEY);

  const runNow = () => runDigest({ pool, index: getIndex(), mailer, fetchEmail, baseUrl });

  registerDigestRoutes(app, { pool, adminKey, runNow });

  const timer = setInterval(() => {
    if (!inSendWindow(new Date())) return;
    runNow().catch((e) => console.error("[digest] weekly run failed:", e.message));
  }, TICK_MS);
  timer.unref(); // never holds the process open

  return { runNow };
}
