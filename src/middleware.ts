import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VALID_TOKEN = "nf2_site_access_granted";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/password" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("site_access")?.value;

  if (token === VALID_TOKEN) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/password", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
