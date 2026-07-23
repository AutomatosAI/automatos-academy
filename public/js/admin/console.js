// Admin console API client (PRD-ADMIN-CONSOLE S6). Thin wrapper over the Spine
// transport (getToken + {success,data,error} envelope) — same seam the sync
// code uses, so the console never re-implements auth.

import { spineRequest } from "../sync/client.js";

export const adminApi = {
  me: () => spineRequest("/api/me"),
  listUsers: (params = {}) => spineRequest(`/api/admin/users?${new URLSearchParams(params).toString()}`),
  getUser: (id) => spineRequest(`/api/admin/users/${encodeURIComponent(id)}`),
  getProgress: (id) => spineRequest(`/api/admin/users/${encodeURIComponent(id)}/progress`),
  patchUser: (id, body) => spineRequest(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteUser: (id) => spineRequest(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** roles the console can assign (owner-only for role changes, enforced server-side). */
export const ROLES = ["learner", "admin", "owner"];
export const isAdminRole = (role) => role === "admin" || role === "owner";
