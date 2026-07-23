// Admin audit log (PRD-ADMIN-CONSOLE). Every admin write records actor + action
// + target + a jsonb detail. Best-effort: an audit failure never blocks the
// action itself (the write already happened / is about to).

const INSERT_SQL = `
  INSERT INTO admin_audit (actor_user_id, actor_clerk_id, action, target_user_id, detail)
  VALUES ($1, $2, $3, $4, $5::jsonb)`;

export function createAuditor(pool, logger = console) {
  return async function audit(req, action, targetUserId, detail = {}) {
    try {
      const actor = req.spineUser || {};
      await pool.query(INSERT_SQL, [
        actor.id ?? null,
        actor.clerk_user_id ?? null,
        action,
        targetUserId ?? null,
        JSON.stringify(detail ?? {}),
      ]);
    } catch (e) {
      (logger.warn || logger.log || (() => {}))(`[admin] audit write failed (${action}): ${e.message}`);
    }
  };
}
