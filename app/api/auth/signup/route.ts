import { createHash, randomBytes } from "node:crypto";
import { MongoServerError } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mailer";
import { getUsersCollection } from "@/lib/user-store";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid signup data." }, { status: 400 });
    }

    const name = parsed.data.name.trim();
    const email = parsed.data.email.trim();
    const emailLower = email.toLowerCase();

    const users = await getUsersCollection();
    const existing = await users.findOne({ emailLower });
    if (existing) {
      return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const verificationToken = randomBytes(32).toString("hex");
    const verificationTokenHash = createHash("sha256").update(verificationToken).digest("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();

    await users.insertOne({
      name,
      email,
      emailLower,
      passwordHash,
      emailVerified: false,
      verificationTokenHash,
      verificationTokenExpiresAt,
      createdAt: now,
      updatedAt: now,
    });

    const mailResult = await sendVerificationEmail({
      to: email,
      name,
      token: verificationToken,
    });

    return NextResponse.json(
      mailResult.delivered
        ? {
            message: "Account created. Check your email to verify your account.",
          }
        : {
            message:
              "Account created in dev mode. SMTP is not configured yet, so use the verification link below.",
            devVerificationUrl: mailResult.verificationUrl,
          },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("smtp") ||
        message.includes("auth") ||
        message.includes("connection") ||
        message.includes("mongo")
      ) {
        return NextResponse.json(
          {
            message: `Signup failed due to server configuration: ${error.message}`,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        message: "Could not create account right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
