/**
 * Password mode (AUTH_MODE=hortus): a BFF in front of the HortusClavis API.
 *
 * The browser posts credentials to devcadence; this module forwards them to
 * Hortus over the server-to-server AUTH_API_URL, then calls /auth/verify to get
 * the trusted user and service permissions. Passwords are never stored, logged
 * or returned, and only live for the duration of this call.
 *
 * Why two calls: /auth/login returns a token, but devcadence does not share
 * Hortus' JWT secret, so it cannot validate that token locally. /auth/verify is
 * the authority. The token is never decoded or persisted here.
 */
import type { ResolvedProfile } from "./claims";
import type { HortusConfig } from "./config";

/** Wrong email/password. Safe to show as a generic login error. */
export class InvalidCredentialsError extends Error {}
/** Hortus is down, returned 5xx, or answered with an invalid payload. */
export class AuthBackendError extends Error {}

interface HortusUser {
  id: string;
  email: string;
  name?: string;
  last_name?: string;
  avatar?: string | null;
}

interface VerifyResponse {
  authenticated: boolean;
  user: HortusUser;
  permissions?: Record<string, string[]>;
}

export interface HortusIdentity {
  user: HortusUser;
  permissions: Record<string, string[]>;
}

async function postJson(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    // Auth responses must never be cached (tokens and user data).
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

/**
 * Authenticate against Hortus and return the verified identity.
 *
 * 401/403 becomes InvalidCredentialsError (the route maps it to a generic
 * message). Any other non-2xx is a backend failure, not a bad password.
 */
export async function authenticateWithHortus(
  config: HortusConfig,
  email: string,
  password: string,
): Promise<HortusIdentity> {
  const loginResponse = await postJson(`${config.apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (loginResponse.status === 401 || loginResponse.status === 403) {
    throw new InvalidCredentialsError("Invalid email or password");
  }
  if (!loginResponse.ok) {
    throw new AuthBackendError(`Hortus login failed (${loginResponse.status})`);
  }

  const login = (await loginResponse.json()) as { access_token?: string };
  if (!login.access_token) throw new AuthBackendError("Hortus did not return an access token");

  const verifyResponse = await postJson(`${config.apiUrl}/auth/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${login.access_token}`,
      Accept: "application/json",
    },
  });
  if (!verifyResponse.ok) {
    throw new AuthBackendError(`Hortus verify failed (${verifyResponse.status})`);
  }

  const verified = (await verifyResponse.json()) as VerifyResponse;
  if (!verified.authenticated || !verified.user) {
    throw new AuthBackendError("Hortus did not authenticate the user");
  }

  return { user: verified.user, permissions: verified.permissions ?? {} };
}

/**
 * Convert a verified Hortus identity into the profile used by role mapping.
 *
 * `iam` permissions belong to Hortus super-admins; the service permissions are
 * scoped to AUTH_API_SERVICE. Both are merged because a super-admin should be
 * an admin in devcadence too, while a tenant user only gets its service actions.
 * Email is marked verified because the password login just proved control of
 * the account; this is not an IdP email claim.
 */
export function profileFromHortus(identity: HortusIdentity, service: string): ResolvedProfile {
  const { user, permissions } = identity;
  const scoped = [...(permissions.iam ?? []), ...(permissions[service] ?? [])];
  return {
    email: user.email.trim().toLowerCase(),
    emailVerified: true,
    name: `${user.name ?? ""} ${user.last_name ?? ""}`.trim() || user.email.split("@")[0],
    groups: [],
    permissions: scoped,
  };
}
