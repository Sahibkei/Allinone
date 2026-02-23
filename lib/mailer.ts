import nodemailer from "nodemailer";

export type SendVerificationResult = {
  delivered: boolean;
  verificationUrl: string;
};

function getMailEnv() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      "Missing SMTP configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.",
    );
  }

  return {
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from,
  };
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function isPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("your_smtp_") ||
    normalized.includes("yourdomain.com") ||
    normalized.includes("replace_with")
  );
}

function hasValidSmtpConfig() {
  const values = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS,
    process.env.SMTP_FROM,
  ];

  if (values.some((value) => !value || !value.trim())) {
    return false;
  }

  return !values.some((value) => isPlaceholder(value as string));
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  token: string;
}): Promise<SendVerificationResult> {
  const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(
    params.token,
  )}`;

  // Developer-friendly fallback: allow account creation locally even before SMTP is wired.
  if (!hasValidSmtpConfig()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP configuration is missing or still uses placeholder values in production.",
      );
    }

    console.warn(
      `[auth] SMTP not configured. Use this verification URL manually in dev: ${verificationUrl}`,
    );
    return {
      delivered: false,
      verificationUrl,
    };
  }

  const env = getMailEnv();
  const transporter = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.secure,
    auth: {
      user: env.user,
      pass: env.pass,
    },
  });

  await transporter.sendMail({
    from: env.from,
    to: params.to,
    subject: "Verify your All In One account",
    text: `Hi ${params.name}, verify your email: ${verificationUrl}`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.55;">
        <h2>Verify your All In One account</h2>
        <p>Hi ${params.name},</p>
        <p>Click the button below to verify your email address:</p>
        <p>
          <a href="${verificationUrl}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#1f64ff;color:#fff;text-decoration:none;font-weight:600;">
            Verify Email
          </a>
        </p>
        <p>If the button does not work, open this link:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    verificationUrl,
  };
}
