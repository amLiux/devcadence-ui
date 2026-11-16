import type { ResolvedProfile } from "./claims";
import type { HortusConfig } from "./config";

export class InvalidCredentialsError extends Error {}
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
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

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

export function profileFromHortus(
  identity: HortusIdentity,
  service: string,
): ResolvedProfile {
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
