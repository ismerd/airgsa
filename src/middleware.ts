import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session-cookie";

// Paths that don't require authentication
const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/quote-room",
  "/api/auth",
  "/api/quote-room",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && pathname.startsWith(p)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return withSecurityHeaders(NextResponse.next(), req);
  }

  if (pathname.startsWith("/freightforwarder")) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", req.url)), req);
  }

  const session = await verifySessionCookie(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    if (pathname.startsWith("/api")) {
      return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), req);
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return withSecurityHeaders(response, req);
  }

  if (!session?.role) {
    if (pathname.startsWith("/api")) {
      return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), req);
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return withSecurityHeaders(response, req);
  }

  // Admin-only routes
  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && session.role !== "admin") {
    if (pathname.startsWith("/api")) {
      return withSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }), req);
    }
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", req.url)), req);
  }

  // Airline-only routes
  if (pathname.startsWith("/airline") && session.role !== "airline") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", req.url)), req);
  }
  if (pathname.startsWith("/airline") && session.role === "airline" && session.accessRole === "operator") {
    const allowed = pathname === "/airline" || pathname.startsWith("/airline/capacity-alerts") || pathname.startsWith("/airline/performance");
    if (!allowed) return withSecurityHeaders(NextResponse.redirect(new URL("/airline", req.url)), req);
  }

  // GSA-only routes
  if (pathname.startsWith("/gsa") && session.role !== "gsa") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", req.url)), req);
  }
  if (pathname.startsWith("/gsa") && session.role === "gsa" && session.accessRole === "operator") {
    if (pathname.startsWith("/gsa/performance/")) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/gsa/performance", req.url)), req);
    }
    const allowed =
      pathname === "/gsa" ||
      pathname.startsWith("/gsa/tasks") ||
      pathname.startsWith("/gsa/cargo-workspace") ||
      pathname === "/gsa/performance" ||
      pathname.startsWith("/gsa/notifications") ||
      pathname.startsWith("/gsa/capacity-alerts") ||
      pathname.startsWith("/gsa/quotes") ||
      pathname.startsWith("/gsa/customers") ||
      pathname.startsWith("/gsa/shipments") ||
      pathname.startsWith("/gsa/flights");
    if (!allowed) return withSecurityHeaders(NextResponse.redirect(new URL("/gsa/cargo-workspace", req.url)), req);
  }

  return withSecurityHeaders(NextResponse.next(), req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

function withSecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );

  if (request.nextUrl.pathname.startsWith("/api")) {
    response.headers.set("Cache-Control", "no-store");
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}
