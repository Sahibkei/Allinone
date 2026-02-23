import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/user-store";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?verify=invalid", request.url));
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const users = await getUsersCollection();
    const now = new Date();

    const result = await users.findOneAndUpdate(
      {
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: { $gt: now },
      },
      {
        $set: {
          emailVerified: true,
          updatedAt: now,
        },
        $unset: {
          verificationTokenHash: "",
          verificationTokenExpiresAt: "",
        },
      },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.redirect(new URL("/login?verify=invalid", request.url));
    }

    return NextResponse.redirect(new URL("/login?verified=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?verify=invalid", request.url));
  }
}
