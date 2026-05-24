import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC_PATHS = new Set([
  "/",
  "/agents",
  "/violations",
  "/leaderboards",
  "/about",
  "/docs",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
];

function isPublicPath(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.has(pathname)) return true;

  // Dynamic agent detail pages are public (read-only)
  if (pathname.startsWith("/agents/")) return true;

  // Auth API routes are public
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;

  // Static assets and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return true;
  }

  return false;
}

function isPublicGetApi(pathname: string, method: string): boolean {
  // GET /api/demo-flow is public (read-only snapshot)
  if (pathname === "/api/demo-flow" && method === "GET") return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow public GET API routes
  if (isPublicGetApi(pathname, method)) {
    return NextResponse.next();
  }

  // Protected routes: verify session
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required. Please connect your wallet and sign in." },
        { status: 401 }
      );
    }
    // Redirect to home for page routes
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await verifySession(sessionToken);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Attach wallet address to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-wallet-address", session.wallet_address);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
