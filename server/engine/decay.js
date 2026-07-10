// Competence decay (PRD-MT-02 US-024, 03-mastery-engine §2, F5).
//
// The curve: exponential drift toward a floor —
//   effective = floor + (stored − floor) · e^(−λ·Δt),  λ = ln2 / halfLife
// with halfLife a function of blueprintWeight: heavily-weighted
// (exam-important) domains decay FASTER so they resurface for maintenance
// sooner. Competence is stored raw and decayed ON READ from `decay_at` —
// nothing ever writes a pre-decayed value (02 §5: the Spine re-derives, the
// client never pushes competence).
//
// First-cut constants (03 §2 says "tune against pilot data"):
//   floor 0.2            — a once-learned scope keeps a residual baseline
//   half-life 120d → 30d — linear in blueprintWeight, saturating at 0.4
//                          (blueprint weights are fractions summing to 1.0
//                          per track; the heaviest real domain today is 0.30)

export const DECAY_FLOOR = 0.2;
export const HALF_LIFE_MAX_DAYS = 120; // weight 0 — light domains decay slowly
export const HALF_LIFE_MIN_DAYS = 30;  // weight ≥ saturation — fast maintenance cycle
export const WEIGHT_SATURATION = 0.4;

const DAY_MS = 86_400_000;

/** Half-life in days for a scope with the given blueprint weight (fraction). */
export function halfLifeDays(blueprintWeight) {
  const w = Math.max(0, Math.min(1, blueprintWeight || 0));
  const t = Math.min(1, w / WEIGHT_SATURATION);
  return HALF_LIFE_MAX_DAYS - (HALF_LIFE_MAX_DAYS - HALF_LIFE_MIN_DAYS) * t;
}

/**
 * Effective (decay-adjusted) competence at `nowMs`, measured from `decayAtMs`
 * (the last-practice timestamp). Values at or below the floor never decay —
 * the curve only ever relaxes DOWN toward the floor, never lifts.
 */
export function effectiveCompetence(stored, decayAtMs, nowMs, blueprintWeight) {
  if (!(stored > DECAY_FLOOR)) return stored;
  const dtMs = Math.max(0, nowMs - decayAtMs);
  if (dtMs === 0) return stored;
  const lambda = Math.LN2 / (halfLifeDays(blueprintWeight) * DAY_MS);
  return DECAY_FLOOR + (stored - DECAY_FLOOR) * Math.exp(-lambda * dtMs);
}
