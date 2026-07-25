/**
 * PRD-WAVE-LIVING-ACADEMY LA-8 — the review queue learns to count.
 *
 * Three columns the approval ladder (§6) cannot work without:
 *
 *  - `batch_id`  the factory posts 20–30 cards a week as ONE batch (D-LA4).
 *                Graduation is measured "over 4 consecutive batches", so a
 *                batch has to be a thing the database knows about, not a
 *                convention in a playbook's head.
 *  - `reject_reason`  demotion keys on `wrong-fact` SPECIFICALLY ("any
 *                wrong-fact reject → immediate return to T0"). A free-text
 *                note cannot be counted, so the reason is a closed set,
 *                enforced here as well as at the API boundary — the same
 *                two-gate discipline the telemetry event types use.
 *  - `provenance` playbook version, model, corpus snapshot date. FR-7 wants
 *                metrics queryable per playbook×format×batch; without this
 *                a bad batch cannot be traced to the thing that wrote it.
 *
 * All three are nullable: every draft written before this migration was a
 * human write-back with no batch, no structured reason and no playbook, and
 * back-filling a fiction would poison the very numbers the ladder reads.
 */

export const shorthands = undefined;

/** §LA-8 — the four verdicts a reviewer can give. `wrong-fact` is the one
 *  with teeth; the rest are calibration signal for the drafter. */
const REJECT_REASONS = `'wrong-fact', 'bad-pedagogy', 'style', 'duplicate'`;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE content_drafts
      ADD COLUMN IF NOT EXISTS batch_id      text,
      ADD COLUMN IF NOT EXISTS reject_reason text,
      ADD COLUMN IF NOT EXISTS provenance    jsonb;

    ALTER TABLE content_drafts
      ADD CONSTRAINT content_drafts_reject_reason_check
      CHECK (reject_reason IS NULL OR reject_reason IN (${REJECT_REASONS}));
  `);

  // The batch rollup reads "every draft of this batch" on every admin page
  // load; the reject-rate report groups by it. Partial — most rows are human
  // write-backs carrying no batch at all.
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS content_drafts_batch_idx
      ON content_drafts (batch_id, status)
      WHERE batch_id IS NOT NULL;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX IF EXISTS content_drafts_batch_idx;
    ALTER TABLE content_drafts DROP CONSTRAINT IF EXISTS content_drafts_reject_reason_check;
    ALTER TABLE content_drafts
      DROP COLUMN IF EXISTS batch_id,
      DROP COLUMN IF EXISTS reject_reason,
      DROP COLUMN IF EXISTS provenance;
  `);
}
