// SMTP transport (D-D2, signed 2026-07-17: the existing PrivateEmail
// mailbox — mail.privateemail.com, SSL 465 / STARTTLS 587 — not an API
// provider). nodemailer is the one new dependency (zero transitive deps);
// hand-rolling SMTP+MIME is exactly the wheel the research-first rule says
// not to reinvent.
//
// SMTP means NO provider webhooks: hard failures surface synchronously at
// send time (the loop skips + logs), async DSN bounces land in the mailbox
// itself — a manual check at pilot volume, revisited if volume grows (§4.4
// adaptation, recorded in the PRD).
//
// Log hygiene (S3 DoD): this module logs NOTHING. Callers log user ids and
// counts; the recipient address exists only inside the sendMail call.
import nodemailer from "nodemailer";

/** Env → transport + from. Throws on missing pieces (fail-loud boot). */
export function createMailer(env = process.env) {
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error("[digest] SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS are all required when DIGEST_ENABLED=true");
  }
  const from = env.DIGEST_FROM || `Automatos Academy <${user}>`;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 upgrades via STARTTLS
    auth: { user, pass },
  });

  return {
    from,
    /** @param {{to:string, subject:string, html:string, text:string, unsubUrl:string}} m */
    async send(m) {
      await transport.sendMail({
        from,
        to: m.to,
        subject: m.subject,
        text: m.text,
        html: m.html,
        headers: {
          // RFC 8058 one-click + the classic header — both point at the
          // tokened endpoint that needs no sign-in (§4.4).
          "List-Unsubscribe": `<${m.unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
    },
    /** For boot-time verification logs (never sends). */
    async verify() {
      return transport.verify();
    },
  };
}
