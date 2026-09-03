import nodemailer from "nodemailer";

/*
 * =========================================================
 * ENVIRONMENT
 * =========================================================
 */

const isProduction = () =>
  String(process.env.NODE_ENV || "development").toLowerCase() ===
  "production";

const smtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

/*
 * =========================================================
 * SMTP TRANSPORT
 * =========================================================
 */

let transporter = null;

function getTransporter() {
  if (!smtpConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),

      secure:
        String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
        Number(process.env.SMTP_PORT) === 465,

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },

      /*
       * Prevent the request from hanging forever
       * if SMTP is unreachable.
       */
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  return transporter;
}

/*
 * =========================================================
 * FROM ADDRESS
 * =========================================================
 */

function fromAddress() {
  return (
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "NexusBank <no-reply@nexusbank.local>"
  );
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function maskedEmail(email) {
  if (!email || !String(email).includes("@")) {
    return "your registered email";
  }

  const [local, domain] = String(email).split("@");

  if (local.length <= 2) {
    return `${local[0] || "*"}***@${domain}`;
  }

  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/*
 * =========================================================
 * GENERIC EMAIL SENDER
 * =========================================================
 *
 * Every email in NexusBank eventually comes through here.
 *
 * Development without SMTP:
 *   - Does not crash the application.
 *   - Logs that SMTP is not configured.
 *
 * SMTP configured:
 *   - Actually sends the email.
 *
 * SMTP failure:
 *   - Logs the exact reason.
 *   - Does not crash the OTP generation flow.
 */

async function sendEmail({
  to,
  subject,
  text,
  html,
  event,
  attachments = undefined,
}) {
  if (!to) {
    console.warn(
      JSON.stringify({
        event: "EMAIL_SKIPPED",
        reason: "RECIPIENT_MISSING",
        type: event,
      })
    );

    return {
      sent: false,
      mode: "skipped",
    };
  }

  const mailer = getTransporter();

  /*
   * =======================================================
   * SMTP NOT CONFIGURED
   * =======================================================
   */

  if (!mailer) {
    console.warn(
      JSON.stringify({
        event: "EMAIL_NOT_SENT",
        type: event,
        to: maskedEmail(to),
        subject,
        reason: "SMTP_NOT_CONFIGURED",
        hint:
          "Configure SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in Backend/.env.",
      })
    );

    return {
      sent: false,
      mode: "log-only",
      error: "SMTP_NOT_CONFIGURED",
    };
  }

  /*
   * =======================================================
   * SEND EMAIL
   * =======================================================
   */

  try {
    const info = await mailer.sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html,
      attachments,
    });

    console.info(
      JSON.stringify({
        event: "EMAIL_SENT",
        type: event,
        to: maskedEmail(to),
        subject,
        messageId: info.messageId,
        response: info.response || null,
      })
    );

    return {
      sent: true,
      mode: "smtp",
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "EMAIL_SEND_FAILED",
        type: event,
        to: maskedEmail(to),
        subject,
        error: error?.message || "Unknown email error",
        code: error?.code || null,
        command: error?.command || null,
      })
    );

    if (isProduction()) {
      console.error(
        "Production SMTP delivery failed. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_SECURE."
      );
    }

    return {
      sent: false,
      mode: "failed",
      error: error?.message || "Email delivery failed",
    };
  }
}

/*
 * =========================================================
 * LOGIN OTP
 * =========================================================
 */

export async function sendLoginOtpEmail({
  to,
  name = "Customer",
  otp,
  expiresInSeconds = 300,
}) {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);

  const minutes = Math.ceil(Number(expiresInSeconds) / 60);

  const subject = `NexusBank sign-in verification code: ${otp}`;

  const text = [
    `Hello ${name},`,
    "",
    "Your NexusBank sign-in verification code is:",
    "",
    String(otp),
    "",
    `This code expires in ${minutes} minutes.`,
    "",
    "If you did not attempt to sign in, you can safely ignore this email.",
    "",
    "NexusBank",
    "Smart banking. Intelligent security.",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033;">

    <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">

      <div style="font-size:24px;font-weight:700;margin-bottom:8px;">
        NexusBank
      </div>

      <div style="color:#64748b;font-size:14px;margin-bottom:28px;">
        Smart banking. Intelligent security.
      </div>

      <h2 style="margin:0 0 12px;">
        Sign-in verification
      </h2>

      <p>
        Hello ${safeName},
      </p>

      <p>
        Use the verification code below to complete your NexusBank sign-in:
      </p>

      <div style="
        font-size:34px;
        letter-spacing:8px;
        font-weight:700;
        text-align:center;
        padding:22px 10px;
        margin:24px 0;
        background:#f8fafc;
        border-radius:12px;
      ">
        ${safeOtp}
      </div>

      <p style="color:#64748b;">
        This code expires in ${minutes} minutes.
      </p>

      <p style="color:#64748b;font-size:13px;">
        If you did not attempt to sign in, you can safely ignore this email.
      </p>

      <hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0;">

      <p style="color:#94a3b8;font-size:12px;margin:0;">
        NexusBank portfolio demonstration
      </p>

    </div>

  </body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    event: "LOGIN_OTP",
  });
}

/*
 * =========================================================
 * PASSWORD RESET OTP
 * =========================================================
 *
 * IMPORTANT:
 * This was previously only console.info().
 * It now actually uses the same SMTP sender.
 */

export async function sendPasswordResetOtpEmail({
  to,
  name = "Customer",
  otp,
  expiresInSeconds = 300,
}) {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);

  const minutes = Math.ceil(Number(expiresInSeconds) / 60);

  const subject =
    `NexusBank password reset verification code: ${otp}`;

  const text = [
    `Hello ${name},`,
    "",
    "We received a request to reset your NexusBank password.",
    "",
    "Your password reset verification code is:",
    "",
    String(otp),
    "",
    `This code expires in ${minutes} minutes.`,
    "",
    "If you did not request a password reset, you can safely ignore this email.",
    "",
    "For your security, never share this verification code with anyone.",
    "",
    "NexusBank",
    "Smart banking. Intelligent security.",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033;">

    <div style="
      max-width:600px;
      margin:40px auto;
      background:#ffffff;
      border-radius:16px;
      padding:32px;
      border:1px solid #e5e7eb;
    ">

      <div style="
        font-size:24px;
        font-weight:700;
        margin-bottom:8px;
      ">
        NexusBank
      </div>

      <div style="
        color:#64748b;
        font-size:14px;
        margin-bottom:28px;
      ">
        Smart banking. Intelligent security.
      </div>

      <h2 style="
        margin:0 0 12px;
      ">
        Password reset verification
      </h2>

      <p>
        Hello ${safeName},
      </p>

      <p>
        We received a request to reset your NexusBank password.
        Enter the verification code below to continue.
      </p>

      <div style="
        font-size:34px;
        letter-spacing:8px;
        font-weight:700;
        text-align:center;
        padding:22px 10px;
        margin:24px 0;
        background:#f8fafc;
        border-radius:12px;
      ">
        ${safeOtp}
      </div>

      <p style="
        color:#64748b;
      ">
        This code expires in ${minutes} minutes.
      </p>

      <div style="
        margin:24px 0;
        padding:16px;
        background:#fff7ed;
        border:1px solid #fed7aa;
        border-radius:10px;
        color:#9a3412;
        font-size:13px;
        line-height:1.6;
      ">
        If you did not request a password reset,
        you can safely ignore this email.
        Never share this verification code with anyone.
      </div>

      <hr style="
        border:0;
        border-top:1px solid #e5e7eb;
        margin:28px 0;
      ">

      <p style="
        color:#94a3b8;
        font-size:12px;
        margin:0;
      ">
        NexusBank portfolio demonstration
      </p>

    </div>

  </body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    event: "PASSWORD_RESET_OTP",
  });
}

/*
 * =========================================================
 * TRANSFER OTP
 * =========================================================
 */

export async function sendTransferOtpEmail({
  to,
  name = "Customer",
  otp,
  expiresInSeconds = 300,
  amountPaise,
  beneficiaryName,
  transactionId,
}) {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);

  const safeBeneficiary = escapeHtml(
    beneficiaryName || "the selected beneficiary"
  );

  const amountRupees = Number.isFinite(Number(amountPaise))
    ? (Number(amountPaise) / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "the requested amount";

  const minutes = Math.ceil(Number(expiresInSeconds) / 60);

  const subject =
    `NexusBank transfer verification: ${otp}`;

  const text = [
    `Hello ${name},`,
    "",
    "A transfer from your NexusBank account requires verification.",
    "",
    `Amount: ₹${amountRupees}`,
    `Beneficiary: ${
      beneficiaryName || "Selected beneficiary"
    }`,
    transactionId
      ? `Transaction ID: ${transactionId}`
      : "",
    "",
    `Your verification code is: ${otp}`,
    "",
    `This code expires in ${minutes} minutes.`,
    "",
    "If you did not initiate this transfer, contact your bank immediately.",
    "",
    "NexusBank",
    "Smart banking. Intelligent security.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<!doctype html>
<html>
  <body style="
    margin:0;
    background:#f5f7fb;
    font-family:Arial,sans-serif;
    color:#172033;
  ">

    <div style="
      max-width:600px;
      margin:40px auto;
      background:#ffffff;
      border-radius:16px;
      padding:32px;
      border:1px solid #e5e7eb;
    ">

      <div style="
        font-size:24px;
        font-weight:700;
        margin-bottom:8px;
      ">
        NexusBank
      </div>

      <div style="
        color:#64748b;
        font-size:14px;
        margin-bottom:28px;
      ">
        Smart banking. Intelligent security.
      </div>

      <h2 style="margin:0 0 12px;">
        Approve your transfer
      </h2>

      <p>
        Hello ${safeName},
      </p>

      <p>
        A transfer from your NexusBank account requires
        additional verification.
      </p>

      <div style="
        background:#f8fafc;
        border-radius:12px;
        padding:18px;
        margin:22px 0;
      ">

        <p style="margin:0 0 8px;">
          <strong>Amount:</strong>
          ₹${amountRupees}
        </p>

        <p style="margin:0 0 8px;">
          <strong>Beneficiary:</strong>
          ${safeBeneficiary}
        </p>

        ${
          transactionId
            ? `
              <p style="margin:0;word-break:break-all;">
                <strong>Transaction ID:</strong>
                ${escapeHtml(transactionId)}
              </p>
            `
            : ""
        }

      </div>

      <p>
        Enter this verification code in NexusBank:
      </p>

      <div style="
        font-size:34px;
        letter-spacing:8px;
        font-weight:700;
        text-align:center;
        padding:22px 10px;
        margin:24px 0;
        background:#f8fafc;
        border-radius:12px;
      ">
        ${safeOtp}
      </div>

      <p style="color:#64748b;">
        This code expires in ${minutes} minutes.
      </p>

      <p style="
        color:#b91c1c;
        font-size:13px;
      ">
        If you did not initiate this transfer,
        do not share this code and contact your bank immediately.
      </p>

      <hr style="
        border:0;
        border-top:1px solid #e5e7eb;
        margin:28px 0;
      ">

      <p style="
        color:#94a3b8;
        font-size:12px;
        margin:0;
      ">
        NexusBank portfolio demonstration
      </p>

    </div>

  </body>
</html>
`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    event: "TRANSFER_OTP",
  });
}

/*
 * =========================================================
 * STATEMENT SHARE EMAIL
 * =========================================================
 */

export async function sendStatementShareEmail({
  to,
  senderName,
  subject,
  message,
  pdfBuffer,
  accountLabel,
  dateRange,
  summary,
}) {
  const period =
    dateRange?.from && dateRange?.to
      ? `${dateRange.from} to ${dateRange.to}`
      : dateRange?.from
      ? `from ${dateRange.from}`
      : dateRange?.to
      ? `until ${dateRange.to}`
      : "All time";

  const safeSenderName = escapeHtml(senderName);
  const safeAccountLabel = escapeHtml(accountLabel);

  const safeMessage = message
    ? escapeHtml(message)
    : "";

  const html = `
    <div style="
      font-family:Helvetica,Arial,sans-serif;
      max-width:560px;
      margin:0 auto;
      color:#0F172A;
    ">

      <div style="
        padding:20px 24px;
        background:linear-gradient(180deg,#0A1120,#10192B);
        color:#fff;
        border-radius:12px 12px 0 0;
      ">

        <h2 style="
          margin:0;
          color:#22D66F;
          letter-spacing:-0.02em;
        ">
          NexusBank
        </h2>

        <p style="
          margin:4px 0 0;
          color:#8B98B0;
          font-size:12px;
        ">
          Account Statement · Shared by ${safeSenderName}
        </p>

      </div>

      <div style="
        padding:24px;
        background:#fff;
        border:1px solid #E5EAF2;
        border-top:none;
        border-radius:0 0 12px 12px;
      ">

        <p>Hi,</p>

        <p>
          ${safeSenderName} has shared a NexusBank account
          statement with you.
        </p>

        <table style="
          width:100%;
          border-collapse:collapse;
          margin:16px 0;
          font-size:14px;
        ">

          <tr>
            <td style="
              padding:8px 0;
              color:#5B6472;
            ">
              Account
            </td>

            <td style="
              padding:8px 0;
              text-align:right;
            ">
              <strong>${safeAccountLabel}</strong>
            </td>
          </tr>

          <tr>
            <td style="
              padding:8px 0;
              color:#5B6472;
            ">
              Period
            </td>

            <td style="
              padding:8px 0;
              text-align:right;
            ">
              <strong>${escapeHtml(period)}</strong>
            </td>
          </tr>

          <tr>
            <td style="
              padding:8px 0;
              color:#5B6472;
            ">
              Entries
            </td>

            <td style="
              padding:8px 0;
              text-align:right;
            ">
              <strong>${escapeHtml(summary?.count ?? 0)}</strong>
            </td>
          </tr>

          <tr>
            <td style="
              padding:8px 0;
              color:#5B6472;
            ">
              Total Credits
            </td>

            <td style="
              padding:8px 0;
              text-align:right;
              color:#0E9F6E;
            ">
              <strong>
                ${escapeHtml(summary?.credit ?? "₹0")}
              </strong>
            </td>
          </tr>

          <tr>
            <td style="
              padding:8px 0;
              color:#5B6472;
            ">
              Total Debits
            </td>

            <td style="
              padding:8px 0;
              text-align:right;
              color:#DC2626;
            ">
              <strong>
                ${escapeHtml(summary?.debit ?? "₹0")}
              </strong>
            </td>
          </tr>

        </table>

        ${
          safeMessage
            ? `
              <div style="
                padding:14px 16px;
                background:#F5F7FB;
                border-left:3px solid #22D66F;
                border-radius:6px;
                font-size:14px;
                line-height:1.5;
                color:#0F172A;
                white-space:pre-wrap;
              ">
                ${safeMessage}
              </div>
            `
            : ""
        }

        <p style="
          margin-top:20px;
          font-size:12px;
          color:#5B6472;
        ">
          The full statement is attached as a PDF.
          This email was sent through NexusBank on behalf
          of the account holder.
        </p>

      </div>

    </div>
  `.trim();

  const text =
    `NexusBank Statement shared by ${senderName}\n\n` +
    `Account: ${accountLabel}\n` +
    `Period: ${period}\n` +
    `Entries: ${summary?.count ?? 0}\n` +
    `Credits: ${summary?.credit ?? "₹0"}\n` +
    `Debits: ${summary?.debit ?? "₹0"}\n\n` +
    (message
      ? `Message from sender:\n${message}\n\n`
      : "") +
    "The full statement is attached as a PDF.";

  return sendEmail({
    to,
    subject,
    text,
    html,
    event: "STATEMENT_SHARE",
    attachments: [
      {
        filename: "nexusbank-statement.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

/*
 * =========================================================
 * DEFAULT EXPORT
 * =========================================================
 */

export default {
  sendLoginOtpEmail,
  sendPasswordResetOtpEmail,
  sendTransferOtpEmail,
  sendStatementShareEmail,
};