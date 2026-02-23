import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getSessionUserByToken } from "@/lib/session-store";

export async function getCurrentUserFromSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    return getSessionUserByToken(token);
  } catch {
    return null;
  }
}
