import nodemailer from "nodemailer";

/**
 * SMTP-backed email service. Kept intentionally small — one transport, two
 * OTP templates, one send() helper. Real credentials come from .env.
 *
 * If SMTP_HOST is empty the service enters "log only" mode: instead of
 * throwing on send(), it prints a structured log line. This lets developers
 * run NexusBank locally without configuring SMTP at all (the `demoOtp`
 * field in the API response still lets them finish the login flow).
 */

let cachedTransport = null;
let transportMode = null; // "smtp" | "log-only"

function buildTransport() {
  if (cachedTransport) return cachedTransport;

  const host = (process.env.SMTP_HOST || "").trim();
  if (!host) {
    transportMode = "log-only";
    return null;
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER || "",
            pass: process.env.SMTP_PASS || "",
          }
        : undefined,
  });
  transportMode = "smtp";
  return cachedTransport;
}

/**
 * Ship one email. Never throws — errors are logged and swallowed so that
 * OTP issuance is never blocked by SMTP downtime. Callers still know the
 * OTP was issued (returned to the client / logged to the console).
 */
async function send({ to, subject, text, html, headers }) {
  const transport = buildTransport();
  if (!transport) {
    console.info(
      JSON.stringify({
        event: "EMAIL_LOG_ONLY",
        to,
        subject,
        reason: "SMTP_HOST is empty",
      })
    );
    return { delivered: false, mode: "log-only" };
  }
  const from = process.env.MAIL_FROM || "NexusBank <no-reply@nexusbank.dev>";
  try {
    const info = await transport.sendMail({ from, to, subject, text, html, headers });
    console.info(
      JSON.stringify({
        event: "EMAIL_SENT",
        to,
        subject,
        messageId: info.messageId,
      })
    );
    return { delivered: true, mode: "smtp", messageId: info.messageId };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "EMAIL_SEND_FAILED",
        to,
        subject,
        message: error?.message,
      })
    );
    return { delivered: false, mode: "smtp", error: error?.message };
  }
}

// --- Templates -------------------------------------------------------------

const brand = {
  primary: "#0b1220",
  accent: "#1f7a4d",
  ink: "#1a1d1a",
  muted: "#5d605b",
  bg: "#f7f7f4",
};

function layout({ preheader, heading, intro, callout, cta, outro }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>NexusBank</title></head>
<body style="margin:0;background:${brand.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:${brand.ink};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #e4e2db;overflow:hidden;box-shadow:0 8px 24px rgba(20,20,20,0.08);">
        <tr><td style="padding:32px 32px 8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:${brand.primary};color:#fff;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">N</div>
            <div style="font-weight:700;letter-spacing:0.02em;">NexusBank</div>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px 8px;">
          <div style="text-transform:uppercase;letter-spacing:0.14em;font-size:11px;color:${brand.muted};font-weight:600;">Security</div>
          <h1 style="font-size:26px;margin:8px 0 12px;letter-spacing:-0.02em;">${heading}</h1>
          <p style="color:${brand.muted};line-height:1.6;margin:0 0 20px;">${intro}</p>
        </td></tr>
        <tr><td style="padding:8px 32px 16px;">
          <div style="background:${brand.bg};border:1px solid #e4e2db;border-radius:14px;padding:20px 24px;text-align:center;">
            <div style="font-size:11px;letter-spacing:0.14em;color:${brand.muted};text-transform:uppercase;font-weight:600;margin-bottom:8px;">Verification code</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:34px;letter-spacing:0.4em;font-weight:700;color:${brand.primary};">${cta}</div>
            ${callout ? `<div style="margin-top:14px;color:${brand.muted};font-size:12px;">${callout}</div>` : ""}
          </div>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;color:${brand.muted};font-size:13px;line-height:1.6;">${outro}</td></tr>
        <tr><td style="background:${brand.bg};padding:20px 32px;border-top:1px solid #e4e2db;color:${brand.muted};font-size:12px;">
          You received this email because a NexusBank sign-in or transfer verification was requested. If it wasn't you, ignore this message and consider changing your password.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// --- Public API ------------------------------------------------------------

export async function sendLoginOtpEmail({ to, name, otp, expiresInSeconds }) {
  if (!to) return { delivered: false, mode: "skipped" };
  const heading = "Confirm your sign-in";
  const preheader = `Your NexusBank verification code is ${otp}`;
  const intro = `Hi ${name || "there"}, use the code below to finish signing in to NexusBank. It expires in ${Math.round(expiresInSeconds / 60)} minutes.`;
  const callout = "Never share this code. NexusBank staff will never ask for it.";
  const outro = "If you did not try to sign in, ignore this email — the code will expire on its own.";
  const html = layout({ preheader, heading, intro, callout, cta: otp, outro });
  const text = `NexusBank verification code: ${otp}\nExpires in ${Math.round(expiresInSeconds / 60)} minutes.\nIf you did not request this, ignore this email.`;
  return send({
    to,
    subject: `NexusBank code: ${otp}`,
    text,
    html,
    headers: { "X-Entity-Ref-ID": `nexusbank-login-${Date.now()}` },
  });
}

export async function sendTransferOtpEmail({
  to,
  name,
  otp,
  expiresInSeconds,
  amountPaise,
  beneficiaryName,
  transactionId,
}) {
  if (!to) return { delivered: false, mode: "skipped" };
  const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Math.round(amountPaise) / 100
  );
  const heading = "Approve your transfer";
  const preheader = `Approve ${rupees} to ${beneficiaryName || "beneficiary"} with code ${otp}`;
  const intro = `Hi ${name || "there"}, use the code below to authorise a transfer of <strong>${rupees}</strong> to <strong>${beneficiaryName || "your beneficiary"}</strong>. The code expires in ${Math.round(expiresInSeconds / 60)} minutes.`;
  const callout = `Reference: ${transactionId || "—"}`;
  const outro = "If you did not initiate this transfer, do not enter the code — your funds are safe until the code is used. You may also block your account from the Security page.";
  const html = layout({ preheader, heading, intro, callout, cta: otp, outro });
  const text = `NexusBank transfer approval code: ${otp}\nAmount: ${rupees}\nBeneficiary: ${beneficiaryName || "—"}\nRef: ${transactionId || "—"}\nExpires in ${Math.round(expiresInSeconds / 60)} minutes.`;
  return send({
    to,
    subject: `NexusBank transfer code: ${otp}`,
    text,
    html,
    headers: { "X-Entity-Ref-ID": `nexusbank-transfer-${transactionId || Date.now()}` },
  });
}

// Test-only helper.
export function _resetEmailTransport() {
  cachedTransport = null;
  transportMode = null;
}