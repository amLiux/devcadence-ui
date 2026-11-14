import { getConnection, updateConnection } from "@/lib/db/connections";
import { OAUTH_PROVIDERS } from "./index";
import { resolveOAuthClient } from "./client";
import { OAUTH_CONFIG_KEYS, tokensFromConfig, tokensToConfig } from "./storage";
import { refreshAccessToken, revokeOAuthToken } from "./tokens";
import { OAuthError, type OAuthProvider, type OAuthTokens } from "./types";

type StoredConnection = NonNullable<Awaited<ReturnType<typeof getConnection>>>;

function providerFor(connection: StoredConnection): OAuthProvider | null {
  const configured = connection.config.provider;
  if (typeof configured === "string" && OAUTH_PROVIDERS[configured]) {
    return OAUTH_PROVIDERS[configured];
  }
  return (
    Object.values(OAUTH_PROVIDERS).find((item) => item.connectionType === connection.type) ?? null
  );
}

function scopesFrom(config: Record<string, unknown>): string[] {
  const raw = config[OAUTH_CONFIG_KEYS.scopes];
  return typeof raw === "string" ? raw.split(" ").filter(Boolean) : [];
}

function withoutTokens(config: Record<string, unknown>): Record<string, unknown> {
  const cleared = { ...config };
  for (const key of Object.values(OAUTH_CONFIG_KEYS)) delete cleared[key];
  delete cleared.email;
  delete cleared.authorizedAt;
  return cleared;
}

function clientFor(
  connection: StoredConnection,
  provider: OAuthProvider,
  origin: string,
) {
  return resolveOAuthClient({
    providerId: provider.id,
    origin,
    configured: {
      clientId: connection.config.clientId,
      clientSecret: connection.config.clientSecret,
    },
  });
}

async function requireAuthorized(
  id: string,
): Promise<{ connection: StoredConnection; provider: OAuthProvider; tokens: OAuthTokens }> {
  const connection = await getConnection(id);
  if (!connection) throw new OAuthError("reconnect_required", "Connection not found");

  const provider = providerFor(connection);
  const tokens = tokensFromConfig(connection.config);
  if (!provider || !tokens) {
    throw new OAuthError("reconnect_required", "Connection is not authorized");
  }
  return { connection, provider, tokens };
}

export async function refreshConnection(input: {
  id: string;
  origin: string;
}): Promise<{ expiresAt: number }> {
  const { connection, provider, tokens } = await requireAuthorized(input.id);
  if (!tokens.refreshToken) {
    throw new OAuthError("reconnect_required", "No refresh token stored");
  }

  const refreshed = await refreshAccessToken({
    provider,
    client: clientFor(connection, provider, input.origin),
    refreshToken: tokens.refreshToken,
    scopes: scopesFrom(connection.config),
  });

  await updateConnection(input.id, {
    config: { ...connection.config, ...tokensToConfig(refreshed) },
  });
  return { expiresAt: refreshed.expiresAt };
}

export async function disconnectConnection(input: {
  id: string;
  origin: string;
}): Promise<{ revoked: boolean }> {
  const { connection, provider, tokens } = await requireAuthorized(input.id);

  let revoked = false;
  if (tokens.accessToken) {
    try {
      await revokeOAuthToken({
        provider,
        client: clientFor(connection, provider, input.origin),
        token: tokens.accessToken,
      });
      revoked = true;
    } catch {
      // Best effort: a dead token must not block clearing the credentials.
      revoked = false;
    }
  }

  await updateConnection(input.id, { config: withoutTokens(connection.config) });
  return { revoked };
}
