import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateNonce } from "@/lib/auth/siwe";

export async function GET() {
  const nonce = generateNonce();
  const cookieStore = await cookies();
  cookieStore.set("agentcourt_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });
  return NextResponse.json({ nonce });
}
