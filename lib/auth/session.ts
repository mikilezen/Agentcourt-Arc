import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "agentcourt_session";
const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 24 hours

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET environment variable is missing or too short (min 32 chars)."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  wallet_address: string;
}

export async function createSession(walletAddress: string): Promise<string> {
  const secret = getSessionSecret();
  const token = await new SignJWT({ wallet_address: walletAddress.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);
  return token;
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    if (!payload.wallet_address || typeof payload.wallet_address !== "string") {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }
  return verifySession(sessionCookie.value);
}
