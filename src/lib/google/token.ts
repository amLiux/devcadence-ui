import { getConnection, getLatestConnectionByType } from "@/lib/db/connections";
import { isExpiring, OAuthError, tokensFromConfig } from "@/lib/oauth";
import { refreshConnection } from "@/lib/oauth/connection-service";

/** Redirect URI is irrelevant for a refresh, but the client resolver asks for a base URL. */
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function getGoogleAccessToken(forceRefresh = false): Promise<string> {
  const connection = await getLatestConnectionByType("Google");
  if (!connection) {
    throw new OAuthError("not_configured", "No Google connection found. Connect one in Connections.");
  }

  const tokens = tokensFromConfig(connection.config);
  if (!tokens) {
    throw new OAuthError("reconnect_required", "The Google connection is not authorized.");
  }

  if (!forceRefresh && !isExpiring(tokens)) return tokens.accessToken;

  await refreshConnection({ id: connection.id, origin: ORIGIN });

  const refreshed = await getConnection(connection.id);
  const next = refreshed ? tokensFromConfig(refreshed.config) : null;
  if (!next) {
    throw new OAuthError("reconnect_required", "The Google connection lost its credentials.");
  }
  return next.accessToken;
}

/**
 * Token-aware fetch: refreshes proactively when the token is near expiry and
 * retries once on a 401. Access tokens are never logged or returned to callers.
 */
export async function googleFetch(url: string, init?: RequestInit, retry = true): Promise<Response> {
  const token = await getGoogleAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 && retry) {
    const refreshed = await getGoogleAccessToken(true);
    return fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${refreshed}` },
    });
  }
  return response;
}
