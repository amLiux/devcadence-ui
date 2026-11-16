import type { AuthConfig } from "./config";
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
  ver: number;
  iat: number;
  exp: number;
}

export interface TransactionPayload {
  aud: typeof TRANSACTION_AUDIENCE;
  state: string;
  nonce: string;
  verifier: string;
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
    if (payload.aud !== audience) return null;
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSessionToken(
  input: { userId: string; email: string; role: Role; version: number },
  config: AuthConfig,
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

export function readSessionToken(
  token: string | undefined,
  config: AuthConfig,
): Promise<SessionPayload | null> {
  return verifyPayload<SessionPayload>(token, config.sessionSecret, SESSION_AUDIENCE);
}

export async function createTransactionToken(
  input: { state: string; nonce: string; verifier: string; returnTo: string },
  config: AuthConfig,
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

export function readTransactionToken(
  token: string | undefined,
  config: AuthConfig,
): Promise<TransactionPayload | null> {
  return verifyPayload<TransactionPayload>(token, config.sessionSecret, TRANSACTION_AUDIENCE);
}

export function sessionCookieOptions(config: AuthConfig) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.appUrl.startsWith("https://"),
    path: "/",
    maxAge: config.sessionTtlSeconds,
  };
}

export function transactionCookieOptions(config: AuthConfig) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.appUrl.startsWith("https://"),
    path: "/api/auth",
    maxAge: config.transactionTtlSeconds,
  };
}
