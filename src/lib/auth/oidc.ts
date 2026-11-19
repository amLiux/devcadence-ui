/**
 * OIDC relying-party primitives: discovery, authorization redirect, code
 * exchange, ID-token verification and userinfo.
 *
 * Security model:
 * - Discovery and JWKS are cached per process (not shared across workers). A
 *   stale cache only costs one extra fetch, never a skipped verification.
 * - ID tokens are verified by hand with node:crypto instead of a JWT library:
 *   split the compact token, find the key by `kid`, verify RS256 over the raw
 *   signing input, and only then trust the claims.
 * - Only RS256 is accepted. `none`, HS256 and public-key confusion are rejected.
 * - Endpoints must be HTTPS except localhost. A misconfigured issuer cannot
 *   downgrade the token exchange or JWKS fetch to plaintext.
 * - This module never persists tokens. Callers decide what to keep.
 */
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

// globalThis keeps the cache across dev hot reloads and per server process.
// It is intentionally not shared between workers; a cold worker just refetches.
const globalCache = globalThis as unknown as { __dcOidcCache?: OidcCache };
const cache: OidcCache = (globalCache.__dcOidcCache ??= {
  discovery: new Map(),
  jwks: new Map(),
});

const DISCOVERY_TTL_MS = 60 * 60 * 1000;
const JWKS_TTL_MS = 5 * 60 * 1000;
// Provider clocks and ours are never exactly equal. 60s is enough for normal
// drift without accepting meaningfully expired tokens.
const CLOCK_SKEW_SECONDS = 60;

/** Any failure that is safe to surface to the caller (never contains secrets). */
export class OidcError extends Error {}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Reject non-HTTPS OIDC endpoints, except loopback URLs used in local dev.
 * This prevents a typo (or an attacker-controlled discovery document) from
 * sending codes, client secrets or tokens over plain HTTP.
 */
export function assertSafeEndpoint(url: string): URL {
  const parsed = new URL(url);
  if (parsed.protocol === "https:") return parsed;
  if (parsed.protocol === "http:" && isLocalHost(parsed.hostname)) return parsed;
  throw new OidcError(`Refusing insecure OIDC endpoint: ${url}`);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    // Never let Next/undici cache discovery, JWKS or token responses.
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new OidcError(`OIDC request failed (${response.status}) for ${url}`);
  }
  return (await response.json()) as T;
}

/**
 * Fetch and cache the provider discovery document.
 *
 * The returned `issuer` must equal the configured issuer: discovery is trusted
 * only when it describes the exact issuer we asked about. All advertised
 * endpoints are validated before use.
 */
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

/**
 * Build the authorization-code redirect.
 *
 * `state` protects the callback from CSRF/login swapping, `nonce` binds the ID
 * token to this login, and the S256 challenge proves the token exchange comes
 * from the client that started the flow. All three are mandatory here.
 */
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

/**
 * Exchange an authorization code for tokens using client_secret_basic.
 *
 * The verifier is sent here, not in the browser redirect, so a stolen code is
 * useless without the transaction cookie. Client credentials are form-encoded
 * inside Basic auth per RFC 6749 §2.3.1.
 */
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
  const credentials = btoa(
    `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`,
  );
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

/**
 * Return the provider signing keys. `force` bypasses the cache so a key
 * rotation with a new `kid` is picked up immediately instead of failing the
 * login until the TTL expires.
 */
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

/**
 * Verify an ID token and return its claims.
 *
 * Order matters: verify the signature first, then validate claims. Never read
 * a claim to decide which key to trust beyond the header `kid`. `expectedNonce`
 * must be the value stored in the signed transaction for this login.
 */
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
    // Unknown kid usually means the provider rotated keys. Refresh once.
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
  if (claims.iss.replace(/\/$/, "") !== config.issuer)
    throw new OidcError("Invalid ID token issuer");
  if (!audienceMatches(claims.aud, config.clientId))
    throw new OidcError("Invalid ID token audience");
  if (!Number.isFinite(claims.exp) || claims.exp + CLOCK_SKEW_SECONDS < now) {
    throw new OidcError("ID token expired");
  }
  if (!claims.sub) throw new OidcError("ID token has no subject");
  // Nonce replay protection: a token minted for another login is rejected.
  if (!claims.nonce || claims.nonce !== expectedNonce) {
    throw new OidcError("Invalid ID token nonce");
  }
  return claims;
}

/**
 * Best-effort userinfo lookup. Some providers do not expose it, or restrict it
 * by scope; a failure must not break login. Role mapping then falls back to ID
 * token claims such as groups/email.
 */
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
