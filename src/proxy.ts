/**
 * Optimistic auth gate for pages and APIs.
 *
 * It verifies only the signed session cookie (signature + audience + expiry).
 * It does not query the database or check roles: that belongs to route handlers
 * and server components via getCurrentUser(). Keeping the proxy cheap avoids a
 * DB round trip for every asset-less request.
 *
 * Anonymous API calls get 401; anonymous page requests redirect to /login and
 * preserve the original path in ?next=. Public paths are defined centrally in
 * route-access.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionSettings, isAuthEnabled } from "@/lib/auth/config";
import { isPublicPath } from "@/lib/auth/route-access";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest): Promise<Response> {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  let config;
  try {
    config = getSessionSettings();
  } catch {
    return new NextResponse("Authentication is misconfigured", { status: 500 });
  }
  if (!config) return NextResponse.next();

  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value, config);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next internals, the favicon and static files with an
  // extension. Public prefixes (login, auth, oauth, webhooks) are handled above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
