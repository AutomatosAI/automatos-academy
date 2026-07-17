// Digest assembly (PRD-DIGEST §4.2–§4.3) — PURE: snapshots in, {subject,
// html, text, zeroWeek} out. No DB, no clock beyond what's passed, fully
// golden-testable. Copy register: factual-protective (MT-12's no-shame rule
// binds); credential-honesty rules apply — never a pass promise, and the
// grep-banned word list from PRD-CREDENTIALS stays banned here.
//
// Delta rules (§4.2):
//   questions practised = this week's seenSum − last week's (repeats count);
//     first digest (no prev) falls back to weekTouched with "in play" copy —
//     seenSum-since-forever would claim the learner's whole history as one week.
//   mastery move = raw-vs-raw per domain, ONLY for domains touched this week
//     (untouched domains would read as demoralising phantom drops);
//     headline = biggest gain, named. No gain ⇒ no line — never a shame line.
//   streak = the rollup verbatim: intact / ended-at-N framing, day 1 waiting.
//   countdown = only when an exam date exists; coverage framing, no verdicts.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Pure delta math, exported for unit tests. */
export function weekDeltas(curr, prev) {
  const tracks = curr.tracks || {};
  let questions = 0;
  let firstDigest = !prev;
  let dueTotal = 0;
  let topGain = null; // {trackKey, domainId, delta}

  for (const [key, t] of Object.entries(tracks)) {
    const prevT = prev && prev.tracks ? prev.tracks[key] : null;
    questions += prev
      ? Math.max(0, (t.seenSum || 0) - ((prevT && prevT.seenSum) || 0))
      : (t.weekTouched || 0);
    dueTotal += t.dueCount || 0;

    const touched = new Set(t.touchedDomains || []);
    for (const [domainId, raw] of Object.entries(t.perDomain || {})) {
      if (!touched.has(domainId)) continue; // §4.2: untouched domains excluded
      const prevRaw = prevT && prevT.perDomain && prevT.perDomain[domainId] !== undefined
        ? prevT.perDomain[domainId] : null;
      if (prevRaw === null) continue; // new domain/new learner — no honest delta yet
      const delta = raw - prevRaw;
      if (delta > 0 && (!topGain || delta > topGain.delta)) {
        topGain = { trackKey: key, domainId, delta };
      }
    }
  }

  return { questions, firstDigest, dueTotal, topGain, zeroWeek: questions === 0 };
}

/** Calendar-day distance to the exam (UTC dates) — "23 days" is date
 *  subtraction, the number a learner would say, not ceil-of-hours (which
 *  reads one high every evening). Exam-day itself still honestly has a
 *  day; past dates render nothing. */
export function daysToExam(iso, nowMs) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
  const exam = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(exam)) return null;
  const today = Date.parse(`${new Date(nowMs).toISOString().slice(0, 10)}T00:00:00Z`);
  const diff = Math.round((exam - today) / 86_400_000);
  if (diff < 0) return null;
  return Math.max(1, diff);
}

function streakLine(streak) {
  const s = streak || { current: 0, best: 0 };
  if (s.current > 0) return `Streak intact — ${s.current} day${s.current === 1 ? "" : "s"}.`;
  if (s.best > 0) return `A streak ended at ${s.best} — day 1 is waiting when you are.`;
  return null;
}

/**
 * @param {{curr:object, prev:object|null, meta:{
 *   trackNames: Record<string,string>,        // "v/t" → display name
 *   domainNames: Record<string,string>,       // "v/t/domainId" → display name
 *   examDates: Record<string,string>,         // "v/t" → "YYYY-MM-DD"
 *   baseUrl: string, unsubUrl: string, nowMs: number,
 * }}} args
 */
export function composeDigest({ curr, prev, meta }) {
  const d = weekDeltas(curr, prev);
  const lines = [];

  const qLine = d.zeroWeek
    ? "A quiet week — nothing practised."
    : d.firstDigest
      ? `${d.questions} question${d.questions === 1 ? "" : "s"} in play this week.`
      : `${d.questions} question${d.questions === 1 ? "" : "s"} practised this week.`;
  lines.push(qLine);

  const sLine = streakLine(curr.streak);
  if (sLine) lines.push(sLine);

  if (d.topGain) {
    const name = meta.domainNames[`${d.topGain.trackKey}/${d.topGain.domainId}`] || d.topGain.domainId;
    lines.push(`${name} up ${Math.round(d.topGain.delta * 100)}% — your biggest move.`);
  }

  // countdown: only for tracks with BOTH a set date and snapshot presence —
  // absent ⇒ the line is absent, never invented (§4.2). Soonest exam wins.
  let countdown = null;
  for (const [key, iso] of Object.entries(meta.examDates || {})) {
    if (!curr.tracks || !curr.tracks[key]) continue;
    const days = daysToExam(iso, meta.nowMs);
    if (days !== null && (!countdown || days < countdown.days)) {
      countdown = { key, days, name: meta.trackNames[key] || key };
    }
  }
  if (countdown) {
    lines.push(`${countdown.days} day${countdown.days === 1 ? "" : "s"} to ${countdown.name} — coverage is what counts now.`);
  }

  const cta = d.dueTotal > 0
    ? { label: `Clear your ${d.dueTotal} due review${d.dueTotal === 1 ? "" : "s"} →`, href: `${meta.baseUrl}/?src=digest` }
    : { label: "Pick up where you left off →", href: `${meta.baseUrl}/?src=digest` };

  const subject = d.zeroWeek
    ? "Your week at the Academy — a quiet one, no rush"
    : `Your week at the Academy — ${qLine.replace(/ this week\.$/, "").replace(/\.$/, "")}${curr.streak && curr.streak.current > 0 ? ", streak intact" : ""}`;

  const text = [
    "AUTOMATOS ACADEMY — YOUR WEEK",
    "",
    ...lines,
    "",
    `${cta.label} ${cta.href}`,
    "",
    "——",
    "You're receiving this weekly summary because you turned it on in your",
    "Academy profile. It contains only your own numbers, once a week.",
    `Unsubscribe (one click, no sign-in): ${meta.unsubUrl}`,
    "The Academy is independent study material — not affiliated with or",
    "endorsed by any certification vendor.",
  ].join("\n");

  const html = `
<div style="margin:0;padding:24px;background:#eef2fa;font-family:Helvetica,Arial,sans-serif;color:#1c2740;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="padding:0 4px 14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#5d6b85;">Automatos Academy — your week</td></tr>
    <tr><td style="background:#ffffff;border-radius:14px;padding:28px;">
      ${lines.map((l) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${esc(l)}</p>`).join("\n      ")}
      <p style="margin:22px 0 0;">
        <a href="${esc(cta.href)}" style="display:inline-block;background:#1c2740;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 22px;font-size:14px;font-weight:600;">${esc(cta.label)}</a>
      </p>
    </td></tr>
    <tr><td style="padding:18px 4px 0;font-size:12px;line-height:1.6;color:#5d6b85;">
      You're receiving this weekly summary because you turned it on in your Academy profile.
      It contains only your own numbers, once a week.
      <a href="${esc(meta.unsubUrl)}" style="color:#5d6b85;">Unsubscribe</a> — one click, no sign-in.<br>
      The Academy is independent study material — not affiliated with or endorsed by any certification vendor.
    </td></tr>
  </table>
</div>`.trim();

  return { subject, html, text, zeroWeek: d.zeroWeek };
}
