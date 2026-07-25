// Item quality flags (PRD-WAVE-LIVING-ACADEMY LA-12) — the flywheel's pure half.
//
// Aggregates come from the database; the JUDGEMENT lives here, where a test
// can reach it without Postgres. A flagged item is evidence attached to a
// revision draft (FR-7), so these thresholds are the difference between "the
// factory learns from use" and "someone eyeballs a spreadsheet".
//
// Every flag carries the numbers that produced it. A revision playbook that is
// told "this item is bad" writes a guess; one told "94% of learners skip it,
// median 1.2s on card" writes a fix.

/**
 * Thresholds are the PRD's (§LA-12), plus one the PRD does not state: a
 * MINIMUM number of attempts. A 100%-correct item with three attempts is not
 * too easy, it is unmeasured — and flagging it would send the factory
 * rewriting content on noise. Same reasoning as the chip grade's attempts
 * floor: day one must not be a wall of verdicts.
 */
export const ITEM_FLAG_RULES = {
  minAttempts: 20,
  tooEasyCorrectRate: 0.98,
  ambiguousCorrectRate: 0.30,
  /** a wrong answer this dominant means the distractor is competing with the
   *  key — the item is ambiguous rather than merely hard */
  ambiguousTopWrongShare: 0.50,
  deadSkipRate: 0.40,
  /** passers should outperform non-passers on a fair item; at or below this
   *  the item is measuring something other than competence */
  backwardsDiscrimination: 0,
  /** discrimination needs both groups represented before it means anything */
  minPerGroup: 5,
};

const rate = (n, d) => (d > 0 ? n / d : null);

/**
 * Naive discrimination: correct-rate among learners who have PASSED a mock,
 * minus correct-rate among those who have not.
 *
 * Null — not zero — when either group is too small. Zero is a real and
 * damning value here (the item separates nobody), so returning it for "we
 * don't know yet" would manufacture the worst finding out of missing data.
 */
export function discrimination({ passerCorrect, passerAttempts, nonPasserCorrect, nonPasserAttempts }) {
  const R = ITEM_FLAG_RULES;
  if (passerAttempts < R.minPerGroup || nonPasserAttempts < R.minPerGroup) return null;
  return rate(passerCorrect, passerAttempts) - rate(nonPasserCorrect, nonPasserAttempts);
}

/**
 * @param stats {itemId, attempts, correct, skipped, served, medianMsOnCard,
 *               topWrongCount, passer*/nonPasser* counts}
 * @returns { itemId, attempts, correctRate, skipRate, discrimination, flags[] }
 *          flags: 'too-easy' | 'ambiguous' | 'dead' | 'backwards'
 */
export function flagItem(stats) {
  const R = ITEM_FLAG_RULES;
  const attempts = Number(stats.attempts) || 0;
  const served = Number(stats.served) || 0;
  const correct = Number(stats.correct) || 0;
  const skipped = Number(stats.skipped) || 0;

  const correctRate = rate(correct, attempts);
  const skipRate = rate(skipped, served);
  const disc = discrimination({
    passerCorrect: Number(stats.passerCorrect) || 0,
    passerAttempts: Number(stats.passerAttempts) || 0,
    nonPasserCorrect: Number(stats.nonPasserCorrect) || 0,
    nonPasserAttempts: Number(stats.nonPasserAttempts) || 0,
  });

  const flags = [];
  // Under the floor nothing is judged — not even "dead". A card served three
  // times and skipped twice is a coincidence, not a finding.
  if (attempts >= R.minAttempts) {
    if (correctRate !== null && correctRate >= R.tooEasyCorrectRate) flags.push("too-easy");

    // Hard AND with the wrong answer concentrated on one distractor. Merely
    // hard is not a defect — a low correct rate spread across every option is
    // an item doing its job on material nobody has learned yet.
    if (correctRate !== null && correctRate <= R.ambiguousCorrectRate) {
      const wrong = attempts - correct;
      const topWrongShare = rate(Number(stats.topWrongCount) || 0, wrong);
      if (topWrongShare !== null && topWrongShare >= R.ambiguousTopWrongShare) flags.push("ambiguous");
    }

    if (skipRate !== null && skipRate >= R.deadSkipRate) flags.push("dead");
    if (disc !== null && disc <= R.backwardsDiscrimination) flags.push("backwards");
  }

  return {
    itemId: stats.itemId,
    attempts,
    served,
    correctRate,
    skipRate,
    medianMsOnCard: stats.medianMsOnCard == null ? null : Number(stats.medianMsOnCard),
    discrimination: disc,
    flags,
  };
}

/** Human sentence a revision draft carries as its evidence line. */
export function flagEvidence(flagged) {
  const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  const parts = [
    `${flagged.attempts} attempts`,
    `${pct(flagged.correctRate)} correct`,
    `${pct(flagged.skipRate)} skipped`,
  ];
  if (flagged.medianMsOnCard != null) parts.push(`${(flagged.medianMsOnCard / 1000).toFixed(1)}s median`);
  if (flagged.discrimination != null) parts.push(`discrimination ${flagged.discrimination.toFixed(2)}`);
  return `${flagged.flags.join(", ") || "no flags"} — ${parts.join(" · ")}`;
}

/** Flag a batch, worst first: most flags, then lowest correct rate. Stable and
 *  deterministic so the admin report does not reshuffle between loads. */
export function flagItems(rows) {
  return rows
    .map(flagItem)
    .filter((r) => r.flags.length > 0)
    .sort(
      (a, b) =>
        b.flags.length - a.flags.length ||
        (a.correctRate ?? 1) - (b.correctRate ?? 1) ||
        String(a.itemId).localeCompare(String(b.itemId)),
    );
}
