import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that CLIENT users cannot access
const AGENCY_ONLY_ROUTES = [
  "/clients",
  "/assets",
  "/templates",
  "/calendar",
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) return NextResponse.next();

  const role = token.role as string | undefined;
  if (role !== "CLIENT") return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Check if the CLIENT user is trying to access an agency-only route
  const isAgencyRoute = AGENCY_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAgencyRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/clients/:path*",
    "/assets/:path*",
    "/templates/:path*",
    "/calendar/:path*",
  ],
};
