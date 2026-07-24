#!/bin/sh
# Pre-deploy migrations, then the server (Gerard's call, 2026-07-24).
#
# WHY THIS EXISTS — the 2026-07-24 incident: `migrations/` only reached
# production through content-publish.yml, which fires solely on pushes
# touching public/content/**. A code-only merge (PR #69) therefore deployed
# new table writes against a database that had never seen the migration, and
# POST /api/sync/progress broke. Every future migration had the same gap.
#
# So: the schema is now brought up to date on every boot, before the server
# accepts a request. A deploy can no longer run ahead of its own schema.
#
# THE TRADEOFF, STATED PLAINLY: a migration that fails now blocks the boot.
# That is deliberate — a service running against a schema it does not match is
# the worse failure, and it fails silently. This one fails loudly, in the
# deploy logs, before any user touches it. Railway will restart-loop until the
# migration is fixed or reverted, which is the correct pressure.
#
# Two guards keep that from being a footgun:
#   1. No DATABASE_URL → skip entirely. File-mode and spine-less deploys have
#      no schema to manage and must boot exactly as they did before.
#   2. node-pg-migrate takes a session advisory lock, so concurrent replica
#      boots serialise instead of racing. Applied migrations are tracked in
#      `pgmigrations`, so a re-run is a no-op.

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] no DATABASE_URL — skipping migrations (file-mode / spine-less deploy)"
else
  echo "[entrypoint] applying migrations…"
  if ! npm run migrate; then
    echo "[entrypoint] ==================================================================="
    echo "[entrypoint] MIGRATION FAILED — refusing to boot against a mismatched schema."
    echo "[entrypoint] The server is NOT starting. Fix or revert the migration and"
    echo "[entrypoint] redeploy; this container will keep restarting until then."
    echo "[entrypoint] ==================================================================="
    exit 1
  fi
  echo "[entrypoint] migrations up to date"
fi

# exec so the server is PID 1 and receives SIGTERM directly — Railway's
# restarts and graceful shutdowns depend on it, and a wrapper shell would
# swallow them.
exec node server.js
