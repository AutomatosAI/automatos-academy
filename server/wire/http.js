// Wire HTTP conventions (PRD-WIRE §4.2): errors are machine-readable and
// envelope-free — `400 {error:"invalid_input", field, reason}` · `401` ·
// `409 {error:"conflict", reason}` · `429` — the platform mission is the
// caller, and it branches on these shapes. Plus the async plumbing express 4
// needs so a rejected handler can't hang a request (same as spine/http.js).

export const invalidInput = (res, field, reason) =>
  res.status(400).json({ error: "invalid_input", field, reason });

export const conflict = (res, reason) =>
  res.status(409).json({ error: "conflict", reason });

export const notFound = (res) => res.status(404).json({ error: "not_found" });

/** Route an async handler's rejection into the router's error handler. */
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Terminal error handler for the wire router — 500, detail logged
 *  server-side only (never leaked to the client). */
export function errorHandler(err, _req, res, next) {
  console.error("[wire] unhandled:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "internal_error" });
}
