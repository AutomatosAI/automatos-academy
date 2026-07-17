# PRD-DIGEST — The weekly progress email: "your week: 43 questions, streak intact, IAM up 12%, 23 days to exam"

**Status:** BUILT (S1–S5, env-dark until SMTP creds land) · D-D1 signed 2026-07-17: **(a) in-process tick**;
D-D2 signed 2026-07-17: **the existing PrivateEmail mailbox over SMTP** (`mail.privateemail.com`, SSL 465 /
STARTTLS 587, nodemailer) — NOT an API provider, so §4.4's provider webhook is replaced by SMTP reality:
synchronous send failures skip-and-log (code only, never the message — rejection strings can echo addresses);
async DSN bounces land in the mailbox and are a manual check at pilot volume, revisited if volume grows.
D-D3/D-D4 recommendations adopted as written. · **Owner:** Academy (Gerard: SMTP creds + envs) · **Last updated:** 2026-07-17
**Repo:** `automatos-academy` (server + one profile toggle; Spine required — the digest has no signed-out variant by construction)
**Related:** PRD-MT-12 (push = channel 1, widget = channel 2; this is **channel 3**, the only one that reaches a learner who isn't opening anything) ·
[PRD-U2](./PRD-UNIFIED/PRD-U2-SHARED-PROFILES-PROGRESS.md) (streak rollup, GDPR endpoints this PRD must extend) ·
[PRD-WEB-LOOP](./PRD-WEB-LOOP.md) (exam-date setting; S5 here consumes it) · [PRD-WIRE](./PRD-WIRE.md) (announcements live there, NOT here)

## 1. Problem

Push and the widget re-engage learners who still open the app; the learner drifting away is
reachable only by email, and the Academy sends none. Grounded honestly (checked 2026-07-17):

- **No email infrastructure exists.** `server.js`'s only email-adjacent surface is `/api/notify`,
  which *forwards* `{email, trackId}` to `NOTIFY_WEBHOOK_URL` and stores nothing. No sender, no
  templates, no suppression list, no provider account.
- **The Spine doesn't know addresses.** `users` is `id, clerk_user_id, workspace_id, plan,
  created_at` (`migrations/1751500000000_spine-initial.js`) — **no email column**, deliberately
  PII-minimal. Addresses live in Clerk; the server already depends on `@clerk/backend`
  (`verifyToken`, `createClerkClient().users.deleteUser` in `server/spine/auth.js`), so
  `users.getUser(clerkUserId)` can fetch the address **at send time, never stored**.
- **The content ingredients exist server-side** — streak (`STREAK_SQL` in `me-routes.js`),
  per-domain mastery (`mastery_map`), progress/mock rows — but *last week's* values to diff against
  do not (§4.2), and **no opt-in state exists anywhere**: a send job must know who asked, which
  alone forces the one new prefs table regardless of every other choice.

## 2. Goals

1. An opted-in learner gets **one email a week**: questions practised, streak state, biggest
   mastery move ("IAM up 12%"), due count, and — when an exam date is known — the countdown. Every
   number real, every claim in the credential-honesty register.
2. **Strictly opt-in.** Default OFF, never pre-checked; one-click unsubscribe that works without
   signing in; `List-Unsubscribe` (+ RFC 8058 one-click POST) on every send.
3. **GDPR-complete by construction:** consent is the lawful basis, the toggle its record; export
   includes the new tables; both existing delete flows erase them; addresses never touch disk or logs.
4. **Quiet failure everywhere:** unconfigured = dark (not broken); a failing send skips one learner,
   not the run; a crashed run resumes without double-sending.

## 3. Non-goals

- **No marketing blasts, no announcements** — the Wire and Discord `#academy-updates` own
  broadcast; this email contains only *the recipient's own numbers*.
- **No drip/onboarding campaigns, no "we miss you" sequences** — one weekly digest, full stop.
  (A zero-activity week gets one gentler variant, then auto-pause — §4.5 — not a funnel.)
- **No open/click tracking pixels** — the privacy-clean analytics posture extends here: CTA links
  carry `?src=digest` into the existing beacon; that is the entire measurement story.
- **No transactional email for other features** (auth mail is Clerk's; notify-me stays a webhook).
- **No per-timezone send windows v1** (one global window, D-D3) and no daily cadence, ever.

## 4. Design

### 4.1 The job — where it runs (D-D1, honest trade-offs)

| Option | For | Against |
|---|---|---|
| (a) **In-process weekly tick** on the academy server | zero new infra; same fail-loud env posture as the Spine; DB adjacent | the deliberately-thin server grows a scheduler; a mid-send redeploy interrupts (ledger makes it resumable); assumes the single-replica Railway shape it has today |
| (b) **Platform mission** (Automatos playbook → authed academy endpoint) | dogfood story, scheduling owned where scheduling lives (the PRD-WIRE S4 pattern) | couples learner comms to platform availability; needs a new authed trigger endpoint + secret; the platform pod inherits half the failure modes |
| (c) **GitHub Action cron** → `POST /api/digest/run` | zero server change | GH cron is best-effort (hours late is normal); learner comms driven from a public repo's CI; another cross-system secret |

**Recommendation: (a)**, made reversible: every send is recorded in the snapshot ledger (§4.2), so
the runner is swappable later — a Postgres **advisory lock** + the `UNIQUE(user_id, week_start)`
ledger make any number of concurrent/replayed runners idempotent. `POST /api/digest/run`
(admin-secret header) ships regardless, for manual runs and the (b) migration path. Env posture
mirrors the Spine: absent `DIGEST_ENABLED` ⇒ feature dark; `DIGEST_ENABLED=true` with missing
provider key/prefs migration ⇒ **refuse to boot** (never a half-alive mailer).

### 4.2 Content assembly — snapshots, because deltas need a last week

`progress` upserts per item (`seen`, `correct`, `answered_at` = *last* answer), so "43 questions
this week" cannot be read back out of it after the fact, and `telemetry` is optional/lossy — honest
weekly numbers need a weekly fix-point. **New table `mastery_snapshots`**: `id, user_id FK,
week_start date, taken_at, stats jsonb, emailed_at nullable, UNIQUE(user_id, week_start)`. `stats`
holds per-track `{seenSum, correctSum, dueCount, perDomain: {id: rawCompetence}, streak}` — one
query pass over existing tables at snapshot time. Then:

- **questions practised** = this week's `seenSum` − last week's (a true answer count, repeats included);
- **mastery delta** = raw-vs-raw per domain **for domains touched this week** (raw, not
  decay-adjusted — otherwise untouched domains read as demoralising phantom drops); headline =
  biggest gain, named: *"Identity & Access Mgmt up 12%"*;
- **streak** = the U2 rollup verbatim: *"streak intact — 12 days"* / *"a streak ended at 9 — day 1
  is waiting"* (factual-protective register, MT-12's no-shame rule binds here);
- **countdown** = from `user_prefs.exam_dates` (§4.4) when present — coverage framing, never a pass
  prediction;
- **address** = Clerk `users.getUser(clerk_user_id)` at send time; logs carry user ids, never addresses.

Missed weeks self-heal: the diff spans back to the last stored snapshot ("since your last digest").
A snapshot row with `emailed_at` set **is** the send ledger — one table, both jobs.

### 4.3 Template

Hand-rolled HTML string, the `/cert/:payload` server-render pattern — no template engine, no MJML.
Periwinkle-plain, <50 KB, plain-text alternative part. Subject: *"Your week at the Academy — 43
questions, streak intact"*. CTAs deep-link the web loop ("Clear your 12 due →") with `?src=digest`.
Footer, mandatory: why you're receiving this · one-click unsubscribe · the standing independence
line. Grep-banned: "verified", pass promises — PRD-CREDENTIALS rules apply verbatim.

### 4.4 Opt-in, prefs, unsubscribe — the new state

- **`user_prefs`**: `user_id PK FK users, digest_enabled bool NOT NULL DEFAULT false, unsub_token
  uuid NOT NULL DEFAULT gen_random_uuid(), exam_dates jsonb NOT NULL DEFAULT '{}', updated_at` —
  written by `PATCH /api/me/prefs` (Spine-authed, validated); `exam_dates` is the server home
  PRD-WEB-LOOP's setter pushes into when signed in — what makes "23 days to exam" real.
- **Web UI:** the profile's "Your data" section gains *"Weekly progress email — Off"* (default off;
  copy states exactly what it contains and how often). Mobile Settings later (MT-08 scaffold), not here.
- **Unsubscribe:** `GET /digest/unsubscribe?u=<user_id>&t=<unsub_token>` → sets
  `digest_enabled=false`, renders a plain confirmation page, requires no sign-in; token rotates on
  re-opt-in so a forwarded old link can't re-toggle someone else's choice. The same pair backs the
  `List-Unsubscribe`/`List-Unsubscribe-Post` headers.
- **GDPR:** purpose = the summary the learner asked for (consent, withdrawable in one click);
  `CHILD_TABLES` in `me-routes.js` grows `user_prefs` + `mastery_snapshots` so **both existing
  delete flows and `/api/me/export` cover the new rows** — the U2 acceptance re-runs against them.
- **Bounces/complaints:** provider webhook → `POST /api/digest/events` (signature-verified) → hard
  bounce or complaint sets `digest_enabled=false`; a complaint is an unsubscribe, not a conversation.

### 4.5 Quiet failure modes

Per-user try/catch — one bad row never aborts the run (skip, count, log). Snapshot-before-send —
a crash resumes at the unsent rows; `UNIQUE` + `emailed_at` prevent double-sends. Clerk or provider
down ⇒ that user (or week) is simply skipped, loud in logs — a late digest is worse than none.
Zero-activity week ⇒ one gentler variant (factual, no guilt); **three consecutive** zero weeks ⇒
auto-pause until the next activity snapshot (derived from the last three ledger rows — no new
state, D-D4).

## 5. User stories

- **US-D1** — A learner toggles the digest on; Sunday evening they get one email with their real
  week: 43 questions, streak intact at 12, IAM up 12%, 23 days to CCA-F, one CTA into their due queue.
- **US-D2** — A learner clicks unsubscribe in a mail client with images off, signed out, on a
  different device: one GET, digest off, confirmation page — no login dance, no "are you sure".
- **US-D3** — A learner exports their data: prefs and snapshots are in the JSON. They delete their
  data: both tables are verifiably empty, and no further email can be assembled or sent.
- **US-D4** — A learner does nothing for a month: the gentle variant, then auto-pause, then silence
  until they return — never a guilt sequence.
- **US-D5** — The send crashes mid-run on a redeploy: the next tick resumes the same week's unsent
  rows; nobody receives two copies.

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S1 | `user_prefs` migration + `PATCH /api/me/prefs` + profile toggle + wipe/export extension | prefs CRUD tested; default-off proven; U2 delete/export tests extended to both new tables and green |
| S2 | `mastery_snapshots` + assembly + compose (no sending) | golden-file HTML + text for a seeded user; delta math unit-tested (repeat answers counted, untouched domains excluded, missed-week span); zero-activity variant renders |
| S3 | Provider adapter + send loop + ledger + unsubscribe endpoint + bounce webhook | idempotence under forced double-run (US-D5); unsubscribe round-trip signed-out; `List-Unsubscribe` headers present; addresses absent from logs (grep test) |
| S4 | Scheduling: weekly tick + advisory lock + `POST /api/digest/run` (admin secret) | dark when unconfigured; fail-loud boot when half-configured; manual trigger honours the same ledger |
| S5 | Exam-date countdown: consume `user_prefs.exam_dates` (write side ships in PRD-WEB-LOOP S1) | countdown renders only when a date exists; absent ⇒ line absent (never invented); coverage framing copy locked |

S1–S2 are buildable before any provider decision; S3 is where D-D2 must be signed.

## 7. Risks

- **Deliverability from a cold domain** — the Academy has never sent mail: dedicated subdomain
  (e.g. `mail.academy.automatos.app`) with provider-guided SPF/DKIM/DMARC before the first send;
  pilot volume is self-warming; complaints auto-unsubscribe (§4.4).
- **Shame copy drift** — a progress email is one adjective from a guilt machine. The MT-12 register
  binds: factual, protective, never "you're losing X"; zero-week variant + auto-pause are
  structural; copy reviews against PRD-CREDENTIALS §2 before ship.
- **The thin server grows a scheduler** — contained by D-D1's reversibility: the ledger owns
  correctness, so moving the trigger to a platform mission later is a transport swap, not a redesign.
- **Clerk as the address oracle** — outage ⇒ skipped week (by design); per-recipient `getUser` is
  rate-limited, so the loop batches with backoff (trivial at pilot volume).
- **Consent theatre** — an opt-in nobody finds is dishonest by omission: the toggle lives on the
  profile learners already visit; never at sign-up, never pre-checked.

## 8. Decision boxes

| # | Decision | Recommendation |
|---|---|---|
| D-D1 | Where the job runs | **(a) in-process weekly tick** + pg advisory lock + snapshot ledger; `POST /api/digest/run` ships for manual/backfill; revisit (b) platform mission once the Wire's platform-side pattern is proven in production |
| D-D2 | Email provider | ~~Resend / Postmark / SES~~ **SIGNED 2026-07-17: existing PrivateEmail mailbox over plain SMTP** (`mail.privateemail.com`, 465/587) — zero new spend, domain mail already warm. Consequences: no provider webhooks (bounce/complaint automation deferred to SMTP-time failures + mailbox DSNs, manual at pilot volume); Namecheap send-rate limits are fine at pilot scale, revisit provider if volume grows |
| D-D3 | Send window + cadence | Weekly, **Sunday 18:00 UTC**, one global window v1 (no tz data exists); per-timezone windows only if opens say it matters — measured via `?src=digest` traffic, not pixels |
| D-D4 | Zero-activity policy | One gentle variant, auto-pause after 3 consecutive zero weeks, auto-resume on activity — derived from the ledger, no new state |
