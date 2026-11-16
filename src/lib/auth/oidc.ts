import { createPublicKey, verify as verifySignature } from "node:crypto";
import type { AuthConfig } from "./config";
import { decodeUtf8, fromBase64Url } from "./encoding";

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface IdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  groups?: string[];
  [key: string]: unknown;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

interface OidcCache {
  discovery: Map<string, CacheEntry<OidcDiscovery>>;
  jwks: Map<string, CacheEntry<JsonWebKey[]>>;
}

const globalCache = globalThis as unknown as { __dcOidcCache?: OidcCache };
const cache: OidcCache = (globalCache.__dcOidcCache ??= {
  discovery: new Map(),
  jwks: new Map(),
});

const DISCOVERY_TTL_MS = 60 * 60 * 1000;
const JWKS_TTL_MS = 5 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 60;

export class OidcError extends Error {}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function assertSafeEndpoint(url: string): URL {
  const parsed = new URL(url);
  if (parsed.protocol === "https:") return parsed;
  if (parsed.protocol === "http:" && isLocalHost(parsed.hostname)) return parsed;
  throw new OidcError(`Refusing insecure OIDC endpoint: ${url}`);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new OidcError(`OIDC request failed (${response.status}) for ${url}`);
  }
  return (await response.json()) as T;
}

export async function getDiscovery(config: AuthConfig): Promise<OidcDiscovery> {
  const cached = cache.discovery.get(config.issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const discoveryUrl = `${config.issuer}/.well-known/openid-configuration`;
  assertSafeEndpoint(discoveryUrl);
  const discovery = await fetchJson<OidcDiscovery>(discoveryUrl, {
    headers: { Accept: "application/json" },
  });

  if (discovery.issuer.replace(/\/$/, "") !== config.issuer) {
    throw new OidcError("Discovery issuer does not match AUTH_OIDC_ISSUER");
  }
  for (const endpoint of [
    discovery.authorization_endpoint,
    discovery.token_endpoint,
    discovery.jwks_uri,
    discovery.userinfo_endpoint,
  ]) {
    if (endpoint) assertSafeEndpoint(endpoint);
  }

  cache.discovery.set(config.issuer, {
    expiresAt: Date.now() + DISCOVERY_TTL_MS,
    value: discovery,
  });
  return discovery;
}

export function buildAuthorizeUrl(
  config: AuthConfig,
  discovery: OidcDiscovery,
  input: { state: string; nonce: string; codeChallenge: string },
): string {
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeAuthorizationCode(
  config: AuthConfig,
  discovery: OidcDiscovery,
  input: { code: string; codeVerifier: string },
): Promise<{ access_token?: string; id_token?: string; token_type?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: config.redirectUri,
    code_verifier: input.codeVerifier,
    client_id: config.clientId,
  });
  const credentials = btoa(`${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`);
  return fetchJson(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });
}

async function getSigningKeys(discovery: OidcDiscovery, force = false): Promise<JsonWebKey[]> {
  const cached = cache.jwks.get(discovery.jwks_uri);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;

  const jwks = await fetchJson<{ keys?: JsonWebKey[] }>(discovery.jwks_uri, {
    headers: { Accept: "application/json" },
  });
  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new OidcError("JWKS endpoint returned no keys");
  }
  cache.jwks.set(discovery.jwks_uri, {
    expiresAt: Date.now() + JWKS_TTL_MS,
    value: jwks.keys,
  });
  return jwks.keys;
}

function decodeJsonPart<T>(value: string, label: string): T {
  try {
    return JSON.parse(decodeUtf8(fromBase64Url(value))) as T;
  } catch {
    throw new OidcError(`Malformed ${label} in ID token`);
  }
}

function audienceMatches(audience: string | string[], clientId: string): boolean {
  return Array.isArray(audience) ? audience.includes(clientId) : audience === clientId;
}

export async function verifyIdToken(
  config: AuthConfig,
  discovery: OidcDiscovery,
  idToken: string,
  expectedNonce: string,
): Promise<IdTokenClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new OidcError("Malformed ID token");

  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeJsonPart<{ alg?: string; kid?: string }>(headerPart, "header");
  if (header.alg !== "RS256") throw new OidcError("Unsupported ID token algorithm");

  const claims = decodeJsonPart<IdTokenClaims>(payloadPart, "payload");
  let keys = await getSigningKeys(discovery);
  let jwk = keys.find((key) => (key as { kid?: string }).kid === header.kid);
  if (!jwk) {
    keys = await getSigningKeys(discovery, true);
    jwk = keys.find((key) => (key as { kid?: string }).kid === header.kid);
  }
  if (!jwk) throw new OidcError("ID token signing key not found");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const valid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${headerPart}.${payloadPart}`),
    publicKey,
    Buffer.from(signaturePart, "base64url"),
  );
  if (!valid) throw new OidcError("Invalid ID token signature");

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss.replace(/\/$/, "") !== config.issuer) throw new OidcError("Invalid ID token issuer");
  if (!audienceMatches(claims.aud, config.clientId)) throw new OidcError("Invalid ID token audience");
  if (!Number.isFinite(claims.exp) || claims.exp + CLOCK_SKEW_SECONDS < now) {
    throw new OidcError("ID token expired");
  }
  if (!claims.sub) throw new OidcError("ID token has no subject");
  if (!claims.nonce || claims.nonce !== expectedNonce) {
    throw new OidcError("Invalid ID token nonce");
  }
  return claims;
}

export async function fetchUserInfo(
  discovery: OidcDiscovery,
  accessToken: string | undefined,
): Promise<Record<string, unknown> | null> {
  if (!accessToken || !discovery.userinfo_endpoint) return null;
  try {
    return await fetchJson<Record<string, unknown>>(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
  } catch {
    return null;
  }
}
