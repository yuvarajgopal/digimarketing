import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that CLIENT users cannot access
const AGENCY_ONLY_ROUTES = [
  "/clients",
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Force password change: redirect all authenticated users with mustChangePassword
  if (token.mustChangePassword) {
    if (pathname !== "/change-password" && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }
    return NextResponse.next();
  }

  // If user is on /change-password but doesn't need to change, redirect away
  if (pathname === "/change-password") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const role = token.role as string | undefined;
  if (role !== "CLIENT") return NextResponse.next();

  // Check if the CLIENT user is trying to access an agency-only route
  const isAgencyRoute = AGENCY_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAgencyRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/clients/:path*",
    "/change-password",
    "/dashboard/:path*",
    "/analytics/:path*",
    "/posts/:path*",
    "/campaigns/:path*",
    "/leads/:path*",
    "/billing/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
