import {
  EXPIRY_SKEW_MS,
  OAuthError,
  type OAuthClient,
  type OAuthErrorCode,
  type OAuthProfile,
  type OAuthProvider,
  type OAuthTokens,
} from "./types";

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

const DEFAULT_EXPIRY_SECONDS = 3600;

/** True when the access token is gone or close enough to expiry that a refresh is cheaper than a failed call. */
export function isExpiring(tokens: OAuthTokens, now = Date.now(), skewMs = EXPIRY_SKEW_MS): boolean {
  return tokens.expiresAt - skewMs <= now;
}

function toTokens(
  body: TokenResponse,
  fallbackScopes: string[],
  now: number,
  previousRefreshToken?: string,
): OAuthTokens {
  if (!body.access_token) {
    throw new OAuthError("exchange_failed", "Token response missing access_token");
  }
  const expiresIn = typeof body.expires_in === "number" ? body.expires_in : DEFAULT_EXPIRY_SECONDS;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? previousRefreshToken,
    expiresAt: now + expiresIn * 1000,
    scopes: body.scope ? body.scope.split(" ").filter(Boolean) : fallbackScopes,
    tokenType: body.token_type ?? "Bearer",
  };
}

async function requestToken(
  provider: OAuthProvider,
  params: Record<string, string>,
  errorCode: OAuthErrorCode,
): Promise<TokenResponse> {
  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || body.error) {
    const detail = body.error_description || body.error || `HTTP ${response.status}`;
    if (body.error === "invalid_grant") {
      throw new OAuthError("reconnect_required", detail);
    }
    throw new OAuthError(errorCode, detail);
  }
  return body;
}

export async function exchangeAuthorizationCode(input: {
  provider: OAuthProvider;
  client: OAuthClient;
  code: string;
  scopes: string[];
}): Promise<OAuthTokens> {
  const body = await requestToken(
    input.provider,
    {
      grant_type: "authorization_code",
      code: input.code,
      client_id: input.client.clientId,
      client_secret: input.client.clientSecret,
      redirect_uri: input.client.redirectUri,
    },
    "exchange_failed",
  );
  return toTokens(body, input.scopes, Date.now());
}

/**
 * Google only returns a refresh token on the first consent (or with prompt=consent),
 * so a refresh must keep the previous one when the response omits it.
 */
export async function refreshAccessToken(input: {
  provider: OAuthProvider;
  client: OAuthClient;
  refreshToken: string;
  scopes: string[];
}): Promise<OAuthTokens> {
  const body = await requestToken(
    input.provider,
    {
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
      client_id: input.client.clientId,
      client_secret: input.client.clientSecret,
    },
    "refresh_failed",
  );
  return toTokens(body, input.scopes, Date.now(), input.refreshToken);
}

export async function fetchOAuthProfile(input: {
  provider: OAuthProvider;
  accessToken: string;
}): Promise<OAuthProfile> {
  const response = await fetch(input.provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${input.accessToken}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new OAuthError("profile_failed", `Profile request failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { email?: string; sub?: string; id?: string };
  const subject = body.sub ?? body.id;
  if (!body.email || !subject) {
    throw new OAuthError("profile_failed", "Profile response missing email or subject");
  }
  return { email: body.email, subject };
}

export async function revokeOAuthToken(input: {
  provider: OAuthProvider;
  client: OAuthClient;
  token: string;
}): Promise<void> {
  if (!input.provider.revokeUrl) return;

  const response = await fetch(input.provider.revokeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: input.token,
      client_id: input.client.clientId,
      client_secret: input.client.clientSecret,
    }),
  });
  if (!response.ok) {
    throw new OAuthError("revoke_failed", `Revoke failed: HTTP ${response.status}`);
  }
}
