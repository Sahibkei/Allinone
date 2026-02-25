import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { isMongoConnectivityError, summarizeError } from "@/lib/auth-error-utils";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
} from "@/lib/auth";
import { claimPendingPurchasesForUser } from "@/lib/entitlements";
import { createSession, deleteSessionByToken, deleteSessionsByUserId } from "@/lib/session-store";
import { getUsersCollection } from "@/lib/user-store";

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (existingToken) {
      await deleteSessionByToken(existingToken).catch(() => {
        // Ignore stale/invalid old session cleanup failures.
      });
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid login data." }, { status: 400 });
    }

    const emailLower = parsed.data.email.trim().toLowerCase();
    const users = await getUsersCollection();
    const user = await users.findOne({ emailLower });

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { message: "Please verify your email before logging in." },
        { status: 403 },
      );
    }

    if (!user._id) {
      return NextResponse.json({ message: "Unable to load account." }, { status: 500 });
    }

    await claimPendingPurchasesForUser({
      userId: user._id,
      email: user.emailLower,
    }).catch((claimError) => {
      console.error("[auth/login] pending purchase claim failed:", summarizeError(claimError));
    });

    // Rotate sessions on each login to guarantee a new active session.
    await deleteSessionsByUserId(user._id).catch(() => {
      // Non-blocking cleanup in case old sessions cannot be deleted.
    });

    const session = await createSession({
      userId: user._id,
      email: user.emailLower,
      name: user.name,
    });

    await users.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } },
    );

    const response = NextResponse.json({ message: "Logged in successfully." });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[auth/login] failed:", summarizeError(error));

    if (isMongoConnectivityError(error)) {
      return NextResponse.json(
        {
          message:
            "Unable to log in due to a database connection issue. Check MONGODB_URI and Atlas Network Access.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Unable to log in right now." }, { status: 500 });
  }
}
