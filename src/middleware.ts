// middleware.ts (project root or src/middleware.ts)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // Allow NextAuth internal routes and static files
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  // If user has a valid NextAuth token, continue.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // redirect to sign-in page with a callback to current full URL
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    //console.log("middleware: redirecting to signin for", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next|public|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map)).*)"],
};
