// PRD-ADMIN-CONSOLE S1 — RBAC. Adds users.role so admin authority comes from a
// real column (learner | admin | owner), not the binary ACADEMY_ADMIN_CLERK_IDS
// env allowlist (which stays only as the bootstrap that seeds the first owner).
// Additive + idempotent: safe on a fresh CI db and on the live Spine once it's up.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'learner';
    -- partial index: only the handful of non-learners are worth indexing.
    CREATE INDEX IF NOT EXISTS users_role_idx ON users (role) WHERE role <> 'learner';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX IF EXISTS users_role_idx;
    ALTER TABLE users DROP COLUMN IF EXISTS role;
  `);
}
