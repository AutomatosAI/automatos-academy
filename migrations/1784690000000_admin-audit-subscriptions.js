// PRD-ADMIN-CONSOLE S2/S4 — the admin audit log + the billing subscriptions
// table. Additive + idempotent; dormant until the Spine + Stripe are configured.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    -- Every admin write (role/plan change, delete) is logged. Actor + target +
    -- a jsonb detail; never deleted with the user (target_user_id has no FK so
    -- the audit survives a user wipe).
    CREATE TABLE IF NOT EXISTS admin_audit (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id  uuid,
      actor_clerk_id text,
      action         text NOT NULL,
      target_user_id uuid,
      detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
      at             timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS admin_audit_at_idx ON admin_audit (at DESC);

    -- Stripe subscription mirror (S4). One row per user; the webhook is the
    -- only writer. users.plan is the denormalized entitlement the app gates on.
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id  text,
      stripe_sub_id       text,
      price_id            text,
      status              text,
      current_period_end  timestamptz,
      updated_at          timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions (stripe_customer_id);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS subscriptions; DROP TABLE IF EXISTS admin_audit;`);
}
