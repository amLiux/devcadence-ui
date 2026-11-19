/**
 * Auth entry point.
 *
 * GET  (oidc)   : create state/nonce/PKCE, store the signed transaction cookie,
 *                 redirect to the provider.
 * GET  (hortus) : the form lives at /login; this endpoint is not used.
 * POST (hortus) : validate Origin, call Hortus server-side, create the session.
 *
 * Passwords are only ever read from the form and forwarded to Hortus; they are
 * never logged, echoed or stored.
 */
import { NextResponse } from "next/server";
import { resolveRole } from "@/lib/auth/claims";
import { getAuthConfig, getAuthMode, getHortusConfig } from "@/lib/auth/config";
import { randomToken } from "@/lib/auth/encoding";
import {
  AuthBackendError,
  authenticateWithHortus,
  InvalidCredentialsError,
  profileFromHortus,
} from "@/lib/auth/hortus";
import { safeReturnTo } from "@/lib/auth/navigation";
import { buildAuthorizeUrl, getDiscovery } from "@/lib/auth/oidc";
import { createPkcePair } from "@/lib/auth/pkce";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  clientIp,
} from "@/lib/auth/rate-limit";
import {
  createSessionToken,
  createTransactionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  TRANSACTION_COOKIE,
  transactionCookieOptions,
} from "@/lib/auth/session";
import { upsertIdentityUser } from "@/lib/auth/users";

function wantsHtml(request: Request): boolean {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function loginUrl(request: Request, code: string, next: string, retryAfter?: number): URL {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);
  if (next !== "/") url.searchParams.set("next", next);
  if (retryAfter !== undefined) url.searchParams.set("retry", String(retryAfter));
  return url;
}

function loginError(request: Request, code: string, next: string): NextResponse {
  return NextResponse.redirect(loginUrl(request, code, next));
}

/**
 * 429 for API clients, a redirect with a friendly error for browser form posts.
 * `Retry-After` is set in both cases.
 */
function rateLimitedResponse(request: Request, next: string, retryAfter: number): NextResponse {
  if (wantsHtml(request)) {
    const response = NextResponse.redirect(
      loginUrl(request, "rate", next, retryAfter),
      303,
    );
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  return NextResponse.json(
    { error: "rate_limited", retry_after: retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/**
 * Fail closed: a login that cannot be rate limited is not allowed. Browser
 * requests get a minimal 503 page; API clients get JSON.
 */
function unavailableResponse(request: Request): NextResponse {
  if (!wantsHtml(request)) {
    return NextResponse.json(
      { error: "auth_unavailable" },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  }

  return new NextResponse(
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sign-in unavailable</title><body style="font-family:system-ui;padding:2rem"><h1>Sign-in is temporarily unavailable</h1><p>The authentication service or its rate limiter cannot be reached. Try again in a moment.</p><p><a href="/login">Back to sign in</a></p></body></html>`,
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "5" },
    },
  );
}

async function handleOidcLogin(request: Request): Promise<Response> {
  try {
    const config = getAuthConfig();
    const discovery = await getDiscovery(config);
    const state = randomToken(24);
    const nonce = randomToken(24);
    const pkce = await createPkcePair();
    const returnTo = safeReturnTo(new URL(request.url).searchParams.get("next"));

    const transaction = await createTransactionToken(
      { state, nonce, verifier: pkce.verifier, returnTo },
      config,
    );
    const redirectUrl = buildAuthorizeUrl(config, discovery, {
      state,
      nonce,
      codeChallenge: pkce.challenge,
    });

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(TRANSACTION_COOKIE, transaction, transactionCookieOptions(config));
    return response;
  } catch (error) {
    console.error("GET /api/auth/login error:", error instanceof Error ? error.message : error);
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }
}

async function handleHortusLogin(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safeReturnTo(String(form.get("next") ?? "/"));

  if (!email || !password) return loginError(request, "missing", next);

  const ip = clientIp(request.headers);

  try {
    const config = getHortusConfig();

    // Count the attempt before touching Hortus. If the limiter cannot reach
    // Redis, fail closed with 503 instead of allowing unlimited guesses.
    const rate = await checkLoginRateLimit({ ip, email }, config);
    if (rate.status === "unavailable") return unavailableResponse(request);
    if (rate.status === "limited") return rateLimitedResponse(request, next, rate.retryAfter);

    const identity = await authenticateWithHortus(config, email, password);
    const profile = profileFromHortus(identity, config.service);
    const role = resolveRole(profile, config);
    const user = await upsertIdentityUser({
      issuer: `hortus:${config.apiUrl}`,
      subject: identity.user.id,
      profile,
      role,
      config,
    });

    // Successful login resets the buckets; a stale counter must not lock a
    // legitimate user out on the next attempt.
    await clearLoginRateLimit({ ip, email });

    const session = await createSessionToken(
      { userId: user.id, email: user.email, role: user.role, version: user.sessionVersion },
      config,
    );
    const response = NextResponse.redirect(new URL(next, config.appUrl));
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(config));
    return response;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) return loginError(request, "invalid", next);
    if (error instanceof AuthBackendError) {
      console.error("POST /api/auth/login backend error:", error.message);
      return loginError(request, "backend", next);
    }
    console.error("POST /api/auth/login error:", error instanceof Error ? error.message : error);
    return loginError(request, "auth", next);
  }
}

export async function GET(request: Request): Promise<Response> {
  const mode = getAuthMode();
  if (mode === "disabled") return NextResponse.redirect(new URL("/", request.url));

  if (mode === "hortus") {
    const next = safeReturnTo(new URL(request.url).searchParams.get("next"));
    const url = new URL("/login", request.url);
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  return handleOidcLogin(request);
}

export async function POST(request: Request): Promise<Response> {
  if (getAuthMode() !== "hortus") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return handleHortusLogin(request);
}
