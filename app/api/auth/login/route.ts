import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySiweMessage } from "@/lib/auth/siwe";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message or signature." },
        { status: 400 }
      );
    }

    // Verify nonce from cookie
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get("agentcourt_nonce");
    if (!nonceCookie?.value) {
      return NextResponse.json(
        { error: "Nonce expired. Please try again." },
        { status: 400 }
      );
    }

    // Verify SIWE signature
    const { address } = await verifySiweMessage(message, signature);

    // Check nonce matches
    if (!message.includes(nonceCookie.value)) {
      return NextResponse.json(
        { error: "Nonce mismatch." },
        { status: 400 }
      );
    }

    // Create JWT session
    const token = await createSession(address);

    // Set session cookie
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    // Clear nonce cookie
    cookieStore.delete("agentcourt_nonce");

    return NextResponse.json({ ok: true, address });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
