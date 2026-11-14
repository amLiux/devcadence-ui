import type { OAuthTokens } from "./types";

/**
 * Connection.config is a flat Record<string, string>, so tokens are flattened
 * here instead of changing the schema. Secrets are encrypted by the dd-36 layer.
 */
export interface OAuthConfigKeys {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scopes: string;
  tokenType: string;
}

export const OAUTH_CONFIG_KEYS: OAuthConfigKeys = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  expiresAt: "expiresAt",
  scopes: "scopes",
  tokenType: "tokenType",
};

export function tokensToConfig(tokens: OAuthTokens): Record<string, string> {
  const config: Record<string, string> = {
    [OAUTH_CONFIG_KEYS.accessToken]: tokens.accessToken,
    [OAUTH_CONFIG_KEYS.expiresAt]: String(tokens.expiresAt),
    [OAUTH_CONFIG_KEYS.scopes]: tokens.scopes.join(" "),
    [OAUTH_CONFIG_KEYS.tokenType]: tokens.tokenType,
  };
  // Omitted when absent so a reconnect merge keeps the stored refresh token.
  if (tokens.refreshToken) {
    config[OAUTH_CONFIG_KEYS.refreshToken] = tokens.refreshToken;
  }
  return config;
}

export function tokensFromConfig(config: Record<string, unknown>): OAuthTokens | null {
  const accessToken = config[OAUTH_CONFIG_KEYS.accessToken];
  if (typeof accessToken !== "string" || !accessToken) return null;

  const rawExpiry = Number(config[OAUTH_CONFIG_KEYS.expiresAt]);
  const refreshToken = config[OAUTH_CONFIG_KEYS.refreshToken];

  return {
    accessToken,
    refreshToken: typeof refreshToken === "string" && refreshToken ? refreshToken : undefined,
    expiresAt: Number.isFinite(rawExpiry) ? rawExpiry : 0,
    scopes: String(config[OAUTH_CONFIG_KEYS.scopes] ?? "").split(" ").filter(Boolean),
    tokenType: String(config[OAUTH_CONFIG_KEYS.tokenType] ?? "Bearer"),
  };
}

/** Keys that must never be serialized to a client, for dd-134 redaction. */
export const OAUTH_SECRET_KEYS: string[] = [
  OAUTH_CONFIG_KEYS.accessToken,
  OAUTH_CONFIG_KEYS.refreshToken,
  "clientSecret",
];
