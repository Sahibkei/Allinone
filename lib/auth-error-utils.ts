type ErrorWithCode = {
  code?: string | number;
  message?: string;
  name?: string;
};

function normalizeText(value: unknown) {
  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (value instanceof Error) {
    return `${value.name} ${value.message}`.toLowerCase();
  }

  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return "";
  }
}

function normalizeCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const code = (error as ErrorWithCode).code;
  if (typeof code === "string" || typeof code === "number") {
    return String(code).toUpperCase();
  }

  return "";
}

export function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

export function isMongoConnectivityError(error: unknown) {
  const text = normalizeText(error);
  const code = normalizeCode(error);

  const mongoTextSignals = [
    "mongo",
    "mongodb",
    "atlas",
    "querysrv",
    "serverselection",
    "topology",
    "dns",
    "enotfound",
    "econnrefused",
    "timed out",
  ];

  const mongoCodeSignals = ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"];

  return (
    mongoTextSignals.some((signal) => text.includes(signal)) ||
    mongoCodeSignals.includes(code)
  );
}

export function isSmtpDeliveryError(error: unknown) {
  const text = normalizeText(error);
  const code = normalizeCode(error);

  const smtpTextSignals = [
    "smtp",
    "nodemailer",
    "gmail",
    "auth",
    "authentication",
    "mail",
    "esocket",
    "eauth",
    "connection",
  ];

  const smtpCodeSignals = ["EAUTH", "ESOCKET", "ECONNECTION", "ETIMEDOUT"];

  return (
    smtpTextSignals.some((signal) => text.includes(signal)) ||
    smtpCodeSignals.includes(code)
  );
}
