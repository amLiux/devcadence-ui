/**
 * Stateless signed cookies for sessions and OIDC transactions.
 *
 * There is no server-side session store. A token is:
 *
 *   base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload))
 *
 * The HMAC key is AUTH_SECRET. Signing uses Web Crypto so the same code works
 * in Node route handlers and in the proxy runtime.
 *
 * This is integrity, not confidentiality: the payload is readable by anyone
 * holding the cookie. Never put secrets in it. It is also not revocable by
 * itself; `ver` is the user's sessionVersion and a route can compare it with the
 * database when revocation matters. The proxy only performs the cheap signature
 * and expiry check.
 *
 * Audiences prevent cross-use:
 * - dc-session: the login session (sub, email, role, version, exp).
 * - dc-oidc-tx: the short-lived OIDC transaction (state, nonce, PKCE verifier,
 *   returnTo), stored in a cookie scoped to /api/auth.
 */
import type { SessionSettings } from "./config";
import { decodeUtf8, encodeUtf8, fromBase64Url, toBase64Url } from "./encoding";

export const SESSION_COOKIE = "dc_session";
export const TRANSACTION_COOKIE = "dc_oidc_tx";

export const SESSION_AUDIENCE = "dc-session";
export const TRANSACTION_AUDIENCE = "dc-oidc-tx";

export type Role = "admin" | "author" | "viewer";

export interface SessionPayload {
  aud: typeof SESSION_AUDIENCE;
  sub: string;
  email: string;
  role: Role;
  /** User.sessionVersion at login time; used for revocation checks. */
  ver: number;
  iat: number;
  exp: number;
}

export interface TransactionPayload {
  aud: typeof TRANSACTION_AUDIENCE;
  /** CSRF/login-swapping protection; echoed by the provider. */
  state: string;
  /** Replay protection for the ID token. */
  nonce: string;
  /** PKCE verifier; never leaves the server except in the token exchange. */
  verifier: string;
  /** Local path to resume after login. Must be validated before use. */
  returnTo: string;
  iat: number;
  exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encodeUtf8(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: object, secret: string): Promise<string> {
  const body = toBase64Url(encodeUtf8(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encodeUtf8(body) as BufferSource);
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verify the HMAC, audience and expiry. Returns null on any problem instead of
 * throwing, so callers can treat an invalid cookie as "not logged in".
 *
 * `crypto.subtle.verify` compares the signature in constant time; the JSON is
 * only parsed after the signature is valid.
 */
async function verifyPayload<T extends { aud: string; exp: number }>(
  token: string | undefined,
  secret: string,
  audience: string,
): Promise<T | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as BufferSource,
      encodeUtf8(body) as BufferSource,
    );
    if (!valid) return null;

    const payload = JSON.parse(decodeUtf8(fromBase64Url(body))) as T;
    // Audience prevents a transaction token from being accepted as a session.
    if (payload.aud !== audience) return null;
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    // Malformed base64/JSON, wrong key type, etc. Treat as unauthenticated.
    return null;
  }
}

/** Create the session cookie value after a successful login. */
export async function createSessionToken(
  input: { userId: string; email: string; role: Role; version: number },
  config: SessionSettings,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    aud: SESSION_AUDIENCE,
    sub: input.userId,
    email: input.email,
    role: input.role,
    ver: input.version,
    iat: now,
    exp: now + config.sessionTtlSeconds,
  };
  return signPayload(payload, config.sessionSecret);
}

/** Read a session cookie. Returns null for missing/tampered/expired tokens. */
export function readSessionToken(
  token: string | undefined,
  config: SessionSettings,
): Promise<SessionPayload | null> {
  return verifyPayload<SessionPayload>(token, config.sessionSecret, SESSION_AUDIENCE);
}

/**
 * Create the short-lived transaction token that carries OIDC state across the
 * redirect. It lives in an httpOnly cookie scoped to /api/auth, not in the URL,
 * so the PKCE verifier is not exposed to the browser history or referrers.
 */
export async function createTransactionToken(
  input: { state: string; nonce: string; verifier: string; returnTo: string },
  config: SessionSettings,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: TransactionPayload = {
    aud: TRANSACTION_AUDIENCE,
    ...input,
    iat: now,
    exp: now + config.transactionTtlSeconds,
  };
  return signPayload(payload, config.sessionSecret);
}

/** Read the OIDC transaction cookie. Null means expired, tampered or missing. */
export function readTransactionToken(
  token: string | undefined,
  config: SessionSettings,
): Promise<TransactionPayload | null> {
  return verifyPayload<TransactionPayload>(token, config.sessionSecret, TRANSACTION_AUDIENCE);
}

/**
 * Cookie flags for the session. `httpOnly` keeps it away from JS, `SameSite=Lax`
 * allows the top-level OIDC redirect back while blocking cross-site POSTs, and
 * `Secure` is tied to the public app URL (HTTPS in real deployments).
 */
export function sessionCookieOptions(config: SessionSettings) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.appUrl.startsWith("https://"),
    path: "/",
    maxAge: config.sessionTtlSeconds,
  };
}

/**
 * Cookie flags for the login transaction. The narrow path means it is only sent
 * to the auth callback, and the shorter TTL limits replay windows.
 */
export function transactionCookieOptions(config: SessionSettings) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.appUrl.startsWith("https://"),
    path: "/api/auth",
    maxAge: config.transactionTtlSeconds,
  };
}
