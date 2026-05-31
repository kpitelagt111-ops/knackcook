import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ADMIN_PATH = /^\/(?:[a-z]{2}\/)?admin(?:\/|$)/i;
const ADMIN_API_PATH = /^\/api\/admin(?:\/|$)/i;
const ADMIN_LOGIN_PATH = /^\/(?:[a-z]{2}\/)?admin\/login(?:\/|$)/i;

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  for (const name of SESSION_COOKIES) {
    if (req.cookies.get(name)?.value) return true;
  }
  return false;
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin API: 401 JSON if unauthenticated; never run i18n on it.
  if (ADMIN_API_PATH.test(pathname)) {
    if (!hasSessionCookie(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Admin is NOT localized — it must never run through next-intl, otherwise
  // localePrefix:"always" rewrites /admin/login to /en/admin/login (404).
  if (ADMIN_PATH.test(pathname)) {
    if (ADMIN_LOGIN_PATH.test(pathname)) {
      return NextResponse.next();
    }
    if (!hasSessionCookie(req)) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Everything else flows through next-intl (locale negotiation/redirects).
  return intlMiddleware(req);
}

export const config = {
  // Exclude ALL /api from next-intl (API routes are never localized). /api/admin
  // is re-included via the second entry so its auth gate still runs.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/admin/:path*"],
};
