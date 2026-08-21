/**
 * PRD-WAVE-LEARNER-UX LX-5 — first-party funnel events.
 *
 * Append-only, identity-free by design (the PRD-GROWTH §3 privacy stance the
 * client beacon already states: no cookies, no identifiers). `session` is an
 * ephemeral per-pageload id — enough to measure step-to-step drop-off within
 * a visit, never a person across visits.
 */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE funnel_events (
      id        bigserial PRIMARY KEY,
      event     text NOT NULL,
      at        timestamptz NOT NULL DEFAULT now(),
      client_at timestamptz,
      path      text,
      session   text,
      props     jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE INDEX funnel_events_event_at ON funnel_events (event, at);
    CREATE INDEX funnel_events_at ON funnel_events (at);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS funnel_events;`);
}
