import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // Skip auth routes & public files
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(.*)$/)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, });
  if (!token) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    // return user to the originally requested path
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Match everything except the excluded paths above
export const config = {
  matcher: ["/((?!api/auth|_next|public|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map)).*)"],
};
