// Academy-native Stripe billing (PRD-ADMIN-CONSOLE S4, owner decision 2026-07-23).
// No SDK — Stripe's REST API over fetch + webhook signature verification over
// node:crypto, so there's no new dependency and no lockfile churn. Dormant when
// STRIPE_SECRET_KEY is absent (checkout/portal 503; webhook 503) — same
// fail-safe posture as the Spine + media plane.
//
//   POST /api/billing/checkout  (learner-authed)  → { url } Stripe Checkout
//   POST /api/billing/portal    (learner-authed)  → { url } billing portal
//   POST /api/billing/webhook   (Stripe-signed)   → writes users.plan

import express from "express";
import crypto from "node:crypto";
import { ok, fail } from "../spine/http.js";

const STRIPE_API = "https://api.stripe.com/v1";

/** Verify a Stripe `Stripe-Signature` header (t=..,v1=..) over the RAW body.
 *  Pure — nowSec injectable for tests. */
export function verifyStripeSig(rawBody, sigHeader, secret, { toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000) } = {}) {
  if (!sigHeader || !secret) return false;
  const parts = {};
  for (const kv of String(sigHeader).split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1 || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowSec - Number(t)) > toleranceSec) return false; // replay window
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Map a Stripe subscription status to the plan we gate on. */
export function planForSubscription(status) {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

/** Apply a verified Stripe event to the DB (subscriptions mirror + users.plan).
 *  Pure over an injectable pool — the testable core of billing. Idempotent. */
export async function handleStripeEvent(pool, event) {
  const type = event && event.type;
  const obj = (event && event.data && event.data.object) || {};

  if (type === "checkout.session.completed") {
    const userId = obj.client_reference_id;
    const customer = obj.customer;
    if (!userId || !customer) return { handled: type, skipped: "missing user/customer" };
    await pool.query(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_sub_id, status, updated_at)
       VALUES ($1,$2,$3,'active', now())
       ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_sub_id = EXCLUDED.stripe_sub_id, status = 'active', updated_at = now()`,
      [userId, customer, obj.subscription || null],
    );
    await pool.query("UPDATE users SET plan = 'pro' WHERE id = $1", [userId]);
    return { handled: type, userId, plan: "pro" };
  }

  if (type === "customer.subscription.created" || type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const customer = obj.customer;
    const status = type === "customer.subscription.deleted" ? "canceled" : obj.status;
    const priceId = obj.items && obj.items.data && obj.items.data[0] && obj.items.data[0].price ? obj.items.data[0].price.id : null;
    const periodEnd = obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null;
    const plan = planForSubscription(status);
    const { rows } = await pool.query(
      `UPDATE subscriptions SET stripe_sub_id = $2, price_id = $3, status = $4, current_period_end = $5, updated_at = now()
       WHERE stripe_customer_id = $1 RETURNING user_id`,
      [customer, obj.id || null, priceId, status, periodEnd],
    );
    if (!rows.length) return { handled: type, skipped: "unknown customer" };
    await pool.query("UPDATE users SET plan = $2 WHERE id = $1", [rows[0].user_id, plan]);
    return { handled: type, userId: rows[0].user_id, plan };
  }

  return { handled: null, ignored: type };
}

async function stripePost(path, form, secret) {
  const r = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  if (!r.ok) throw new Error(`stripe ${path} → ${r.status}`);
  return r.json();
}

const baseUrl = (req, env) => env.ACADEMY_BASE_URL || `${req.protocol}://${req.get("host")}`;

/** Mount /api/billing/*. `auth` is the Spine auth middleware (learner identity). */
export function mountBilling(app, { pool, auth, env = process.env } = {}) {
  const secret = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const json = express.json({ limit: "8kb" });

  app.post("/api/billing/checkout", auth, json, (req, res, next) => (async () => {
    if (!secret) return fail(res, 503, "billing_not_configured");
    const priceId = (req.body && req.body.priceId) || env.STRIPE_DEFAULT_PRICE_ID;
    if (!priceId) return fail(res, 400, "missing_price");
    const base = baseUrl(req, env);
    const session = await stripePost("/checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      client_reference_id: req.spineUser.id,
      success_url: `${base}/#/profile?upgraded=1`,
      cancel_url: `${base}/#/profile`,
    }, secret);
    return ok(res, { url: session.url, id: session.id });
  })().catch(next));

  app.post("/api/billing/portal", auth, json, (req, res, next) => (async () => {
    if (!secret) return fail(res, 503, "billing_not_configured");
    const { rows } = await pool.query("SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1", [req.spineUser.id]);
    const customer = rows[0] && rows[0].stripe_customer_id;
    if (!customer) return fail(res, 404, "no_customer");
    const session = await stripePost("/billing_portal/sessions", { customer, return_url: `${baseUrl(req, env)}/#/profile` }, secret);
    return ok(res, { url: session.url });
  })().catch(next));

  // Stripe-signed (no auth). The signature must verify against the EXACT bytes
  // Stripe hashed, so server.js's global express.json is configured with a
  // `verify` hook that stashes the raw Buffer on req.rawBody (the standard
  // pattern when a global parser is already mounted).
  app.post("/api/billing/webhook", (req, res, next) => (async () => {
    if (!webhookSecret) return res.status(503).json({ error: "billing_not_configured" });
    const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : "";
    if (!verifyStripeSig(raw, req.headers["stripe-signature"], webhookSecret)) {
      return res.status(400).json({ error: "bad_signature" });
    }
    let event;
    try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: "bad_json" }); }
    const result = await handleStripeEvent(pool, event);
    return res.json({ received: true, ...result });
  })().catch(next));

  return { configured: Boolean(secret), webhookReady: Boolean(webhookSecret) };
}
