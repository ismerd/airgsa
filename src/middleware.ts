import { NextRequest, NextResponse } from "next/server";

// Paths that don't require authentication
const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/api/auth",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && pathname.startsWith(p)
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get("airgsa-session")?.value;
  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let session: { role: string } | null = null;
  try {
    session = JSON.parse(sessionCookie) as { role: string };
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!session?.role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && session.role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Airline-only routes
  if (pathname.startsWith("/airline") && session.role !== "airline") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // GSA-only routes
  if (pathname.startsWith("/gsa") && session.role !== "gsa") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
