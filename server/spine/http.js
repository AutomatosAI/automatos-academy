// Spine HTTP conventions (PRD-MT-02 FR-1): every /api/me/* + /api/sync/*
// response wears the {success, data, error} envelope — the catalog stays
// envelope-free per CONTENT-API-CONTRACT §1. Plus the tiny async plumbing
// express 4 needs so a rejected handler can't hang a request.

export const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data, error: null });

export const fail = (res, status, error, data = null) =>
  res.status(status).json({ success: false, data, error });

/** Route an async handler's rejection into the router's error handler. */
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Terminal error handler for spine routers — enveloped 500, detail logged
 *  server-side only (never leaked to the client). */
export function errorHandler(err, _req, res, next) {
  console.error("[spine] unhandled:", err);
  if (res.headersSent) return next(err);
  fail(res, 500, "internal_error");
}
