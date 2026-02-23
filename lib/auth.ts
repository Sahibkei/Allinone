import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "aio_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
