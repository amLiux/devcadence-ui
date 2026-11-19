/**
 * OIDC callback.
 *
 * 1. Read the signed transaction cookie (state, nonce, PKCE verifier, returnTo).
 * 2. Reject provider errors, missing/mismatched state, expired transactions.
 * 3. Exchange the code server-side with the verifier and client secret.
 * 4. Verify the ID token (signature, issuer, audience, expiry, nonce) and fetch
 *    userinfo for permissions.
 * 5. Link/provision the local user, create the session cookie, clear the
 *    transaction cookie and redirect to returnTo.
 *
 * Errors are mapped to /login?error=... without leaking provider details.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { extractProfile, resolveRole } from "@/lib/auth/claims";
import { getAuthConfig, getAuthMode } from "@/lib/auth/config";
import {
  exchangeAuthorizationCode,
  fetchUserInfo,
  getDiscovery,
  verifyIdToken,
} from "@/lib/auth/oidc";
import {
  SESSION_COOKIE,
  TRANSACTION_COOKIE,
  createSessionToken,
  readTransactionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { AuthLinkError, upsertIdentityUser } from "@/lib/auth/users";

function clearTransaction(response: NextResponse): void {
  response.cookies.set(TRANSACTION_COOKIE, "", { path: "/api/auth", maxAge: 0 });
}

function parseCallback(request: Request) {
  const url = new URL(request.url);
  return {
    state: url.searchParams.get("state"),
    code: url.searchParams.get("code"),
    providerError: url.searchParams.get("error"),
  };
}

function logoutRedirect(request: Request): NextResponse {
  const response = NextResponse.redirect(new URL("/login?logged_out=1", request.url));
  clearTransaction(response);
  return response;
}

function failure(request: Request, code: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
  clearTransaction(response);
  return response;
}

export async function GET(request: Request): Promise<Response> {
  if (getAuthMode() !== "oidc") return NextResponse.redirect(new URL("/login", request.url));

  try {
    const config = getAuthConfig();
    const { state, code, providerError } = parseCallback(request);

    if (state === "logout" && !code) return logoutRedirect(request);

    const cookieStore = await cookies();
    const transaction = await readTransactionToken(
      cookieStore.get(TRANSACTION_COOKIE)?.value,
      config,
    );

    if (!transaction || !state || state !== transaction.state) return failure(request, "state");
    if (providerError || !code) return failure(request, "denied");

    const discovery = await getDiscovery(config);
    const tokens = await exchangeAuthorizationCode(config, discovery, {
      code,
      codeVerifier: transaction.verifier,
    });
    if (!tokens.id_token) return failure(request, "token");

    const claims = await verifyIdToken(config, discovery, tokens.id_token, transaction.nonce);
    const userInfo = await fetchUserInfo(discovery, tokens.access_token);
    const profile = extractProfile(claims, userInfo);
    const role = resolveRole(profile, config);
    const user = await upsertIdentityUser({
      issuer: config.issuer,
      subject: claims.sub,
      profile,
      role,
      config,
    });

    const session = await createSessionToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        version: user.sessionVersion,
      },
      config,
    );
    const response = NextResponse.redirect(new URL(transaction.returnTo, config.appUrl));
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(config));
    clearTransaction(response);
    return response;
  } catch (error) {
    if (error instanceof AuthLinkError) return failure(request, "link");
    console.error("GET /api/auth/callback error:", error instanceof Error ? error.message : error);
    return failure(request, "auth");
  }
}
