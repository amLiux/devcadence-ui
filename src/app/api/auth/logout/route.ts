import { NextResponse } from "next/server";
import { getAuthConfig, isAuthEnabled } from "@/lib/auth/config";
import { getDiscovery } from "@/lib/auth/oidc";
import { SESSION_COOKIE, TRANSACTION_COOKIE } from "@/lib/auth/session";

async function upstreamLogoutUrl(request: Request): Promise<URL | null> {
  if (!isAuthEnabled()) return null;
  try {
    const config = getAuthConfig();
    if (!config.upstreamLogout) return null;

    const discovery = await getDiscovery(config);
    if (!discovery.end_session_endpoint) return null;

    const url = new URL(discovery.end_session_endpoint);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("post_logout_redirect_uri", config.redirectUri);
    url.searchParams.set("state", "logout");
    return url;
  } catch (error) {
    console.error("Upstream logout failed:", error instanceof Error ? error.message : error);
    return new URL("/login?logged_out=1", request.url);
  }
}

async function handleLogout(request: Request): Promise<Response> {
  const upstream = await upstreamLogoutUrl(request);
  const response = NextResponse.redirect(upstream ?? new URL("/login?logged_out=1", request.url));

  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(TRANSACTION_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  return response;
}

export function GET(request: Request): Promise<Response> {
  return handleLogout(request);
}

export function POST(request: Request): Promise<Response> {
  return handleLogout(request);
}
