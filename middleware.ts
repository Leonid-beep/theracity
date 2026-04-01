import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/start",
  "/about",
  "/auth",
  "/api/auth",
  "/api/photo",
  "/api/s3",
  "/api/filters",
];

function isPublicPath(pathname: string, req: NextRequest): boolean {
  if (pathname === "/") return true;
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;

  const m = req.method;
  if (m === "GET" || m === "HEAD") {
    if (pathname === "/api/photos") return true;
    if (
      pathname.startsWith("/api/photos/") &&
      !pathname.startsWith("/api/photos/favorites")
    ) {
      return true;
    }
  }

  return false;
}

function redirectToLogin(req: NextRequest) {
  const url = new URL("/auth/login", req.url);
  url.searchParams.set("returnTo", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname, req)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
