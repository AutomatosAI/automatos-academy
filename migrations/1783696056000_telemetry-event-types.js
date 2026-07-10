/**
 * Telemetry event-type extension (app docs/PILOT-METRICS.md §3 — the MT-02
 * "morning integration patch"). The Coach app now emits six telemetry types
 * beyond the initial four: MT-04's `consent` (US-041 acknowledgement) and
 * `onboarding` (FR-4 funnel), plus MT-07's F10 pilot-metric set
 * (`gate_transition`, `weak_domain_closed`, `session_open`, `exam_outcome`).
 *
 * validate.js gates the same ten values at the boundary; without this ALTER
 * a validated event still dies at INSERT — the initial migration's inline
 * column CHECK pinned event_type to the original four. Postgres names an
 * unnamed inline column CHECK `<table>_<column>_check`, so the constraint to
 * replace is `telemetry_event_type_check`.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE telemetry DROP CONSTRAINT telemetry_event_type_check;
    ALTER TABLE telemetry ADD CONSTRAINT telemetry_event_type_check CHECK (event_type IN (
      'answer', 'card_outcome', 'session', 'scenario',
      'consent', 'onboarding',
      'gate_transition', 'weak_domain_closed', 'session_open', 'exam_outcome'
    ));
  `);
}

export async function down(pgm) {
  // NB: reverting requires no stored rows carrying the six newer types.
  pgm.sql(`
    ALTER TABLE telemetry DROP CONSTRAINT telemetry_event_type_check;
    ALTER TABLE telemetry ADD CONSTRAINT telemetry_event_type_check CHECK (
      event_type IN ('answer', 'card_outcome', 'session', 'scenario')
    );
  `);
}
