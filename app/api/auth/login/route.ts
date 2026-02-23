import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
} from "@/lib/auth";
import { createSession } from "@/lib/session-store";
import { getUsersCollection } from "@/lib/user-store";

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
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
  } catch {
    return NextResponse.json({ message: "Unable to log in right now." }, { status: 500 });
  }
}
