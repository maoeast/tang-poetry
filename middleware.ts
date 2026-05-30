import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  normalizeNextPath,
} from "@/lib/auth/session";

const PUBLIC_FILE_PATTERN = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/unlock") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (!process.env.APP_PASSWORD) {
    return NextResponse.next();
  }

  const verified =
    request.cookies.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;

  if (verified) {
    return NextResponse.next();
  }

  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.search = "";
  unlockUrl.searchParams.set(
    "next",
    normalizeNextPath(`${pathname}${search}`),
  );

  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/:path*"],
};
