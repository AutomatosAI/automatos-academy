#!/bin/sh
# Boot sequence: migrations, then the course content publish, then the server.
#
# ── 1. Migrations (Gerard's call, 2026-07-24) ────────────────────────────
#
# WHY THIS EXISTS — the 2026-07-24 incident: `migrations/` used to reach
# production only through content-publish.yml, which fired solely on pushes
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
#
# ── 2. Course content publish (2026-10-19) ───────────────────────────────
#
# WHY THIS EXISTS — with CONTENT_SOURCE=db the server serves course content
# from Postgres, and content-publish.yml (GitHub Actions) used to be the only
# writer. Production Postgres is reachable only on Railway's private network,
# and the public URL that job used pointed at a different database, so it
# failed on every content merge (last success: 19 Aug 2026) and new content
# never went live. The publish now runs here, inside Railway, on the same
# DATABASE_URL the server uses — so every deploy publishes the content tree it
# ships with, unless that exact tree was published before, in which case the
# pointer is left alone (see DEPLOY.md → Rollback). That includes a git revert
# to an earlier tree: the publish logs a WARNING inside a "THIS DEPLOY'S COURSE
# CONTENT IS NOT LIVE" banner and the pointer stays put.
#
# `npm run publish-content` validates first (the same gate as
# `npm run validate`), writes the whole version in one transaction, and is
# idempotent per content version: an unchanged tree is a no-op, and a
# concurrent replica that loses the insert race logs and exits 0.
#
# THE TRADEOFF IS THE OPPOSITE OF MIGRATIONS: a publish that fails does NOT
# block the boot. The server keeps serving the last published version (and
# polls for a new one every 60 s), which is a safe state; refusing to boot
# would take the site down over a content problem. If no version has EVER been
# published, the server itself refuses to boot (server/catalog-db.js), so a
# failed first publish still fails loudly. The publish's connection carries
# connect, lock and statement timeouts plus a client-side query timeout, and
# the whole run is capped at 180 s, so a held lock or a connection that goes
# silent fails it rather than hanging the boot.
#
# Runs only when DATABASE_URL is set AND CONTENT_SOURCE=db. Files-mode deploys
# serve public/content straight from disk and have nothing to publish.
#
# ── Stops during boot (2026-10-19) ───────────────────────────────────────
#
# Until `exec node server.js`, this shell is PID 1, and PID 1 ignores any
# signal it has no handler for. Without the trap below, a Railway stop or
# redeploy that lands during migrate or publish would be held until the step
# finished, or until the grace period ran out and SIGKILL ended it. The trap
# forwards SIGTERM to the running step (npm forwards it on to the node
# process), waits for it, and exits 143 (130 for SIGINT) without starting the
# server. An open migration or publish transaction rolls back when its
# connection closes, so the next boot starts clean.
#
# run_step runs each step in the background and `wait`s for it, because sh
# runs a trap only after a FOREGROUND command finishes, while `wait` returns
# as soon as a trapped signal arrives. The step's output still goes to the
# deploy log; its stdin is /dev/null, and neither step reads stdin. exec
# replaces this shell, so the server keeps its own signal handling.

set -e

step_pid=""
on_signal() {
  echo "[entrypoint] $1 during boot — stopping the running step; the server will not start"
  if [ -n "$step_pid" ]; then
    kill -TERM "$step_pid" 2>/dev/null || true
    wait "$step_pid" 2>/dev/null || true
  fi
  exit "$2"
}
trap 'on_signal SIGTERM 143' TERM
trap 'on_signal SIGINT 130' INT

run_step() {
  "$@" &
  step_pid=$!
  step_status=0
  wait "$step_pid" || step_status=$?
  step_pid=""
  return "$step_status"
}

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] no DATABASE_URL — skipping migrations (file-mode / spine-less deploy)"
else
  echo "[entrypoint] applying migrations…"
  if ! run_step npm run migrate; then
    echo "[entrypoint] ==================================================================="
    echo "[entrypoint] MIGRATION FAILED — refusing to boot against a mismatched schema."
    echo "[entrypoint] The server is NOT starting. Fix or revert the migration and"
    echo "[entrypoint] redeploy; this container will keep restarting until then."
    echo "[entrypoint] ==================================================================="
    exit 1
  fi
  echo "[entrypoint] migrations up to date"

  if [ "$CONTENT_SOURCE" = "db" ]; then
    echo "[entrypoint] publishing course content (CONTENT_SOURCE=db)…"
    if run_step npm run publish-content; then
      echo "[entrypoint] content publish finished — the [publish] line above says what it did"
    else
      echo "[entrypoint] ==================================================================="
      echo "[entrypoint] CONTENT PUBLISH FAILED — serving the last published version."
      echo "[entrypoint] The server IS starting. New course content from this deploy is"
      echo "[entrypoint] NOT live. Read the publish output above. Invalid content: fix it"
      echo "[entrypoint] in git and redeploy (the new deploy publishes on boot). Transient"
      echo "[entrypoint] failure (database/network): re-run in place:"
      echo "[entrypoint]   railway ssh --service automatos-academy -- \"npm run publish-content\""
      echo "[entrypoint] ==================================================================="
    fi
  else
    echo "[entrypoint] CONTENT_SOURCE is not db — skipping content publish (files mode serves public/content from disk)"
  fi
fi

# exec so the server is PID 1 and receives SIGTERM directly — Railway's
# restarts and graceful shutdowns depend on it, and a wrapper shell would
# swallow them.
exec node server.js
