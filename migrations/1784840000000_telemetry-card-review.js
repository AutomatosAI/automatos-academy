/**
 * PRD-WAVE-LIVING-ACADEMY LA-3 — allow the `card_review` telemetry type.
 *
 * The binary Got-it / Missed-it grade, one row per card served in the typed
 * feed. `server/spine/validate.js` gates the same eleven values at the
 * boundary; without this ALTER a validated event still dies at INSERT — the
 * column CHECK is the second, independent gate (the same lesson the MT-04/
 * MT-07 event types taught, migration 1783696056000).
 *
 * Constraint name: Postgres names an unnamed inline column CHECK
 * `<table>_<column>_check`, and the previous migration re-created it under
 * that name explicitly, so it is still `telemetry_event_type_check`.
 */

export const shorthands = undefined;

const TYPES_AFTER = `
  'answer', 'card_outcome', 'session', 'scenario',
  'consent', 'onboarding',
  'gate_transition', 'weak_domain_closed', 'session_open', 'exam_outcome',
  'card_review'
`;

const TYPES_BEFORE = `
  'answer', 'card_outcome', 'session', 'scenario',
  'consent', 'onboarding',
  'gate_transition', 'weak_domain_closed', 'session_open', 'exam_outcome'
`;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE telemetry DROP CONSTRAINT telemetry_event_type_check;
    ALTER TABLE telemetry ADD CONSTRAINT telemetry_event_type_check
      CHECK (event_type IN (${TYPES_AFTER}));
  `);
}

export async function down(pgm) {
  // NB: reverting requires no stored rows carrying 'card_review'.
  pgm.sql(`
    ALTER TABLE telemetry DROP CONSTRAINT telemetry_event_type_check;
    ALTER TABLE telemetry ADD CONSTRAINT telemetry_event_type_check
      CHECK (event_type IN (${TYPES_BEFORE}));
  `);
}
