import { OAuthError, type OAuthClient } from "./types";

function envKey(providerId: string, suffix: string): string {
  const prefix = providerId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `${prefix}_${suffix}`;
}

/**
 * Client credentials are instance-level: one OAuth app per DevCadence install.
 * A per-connection override exists for self-hosted teams that bring their own
 * OAuth client, but it can only be read once the connection exists.
 */
export function resolveOAuthClient(input: {
  providerId: string;
  origin: string;
  configured?: { clientId?: unknown; clientSecret?: unknown };
}): OAuthClient {
  const configuredId = typeof input.configured?.clientId === "string" ? input.configured.clientId : "";
  const configuredSecret =
    typeof input.configured?.clientSecret === "string" ? input.configured.clientSecret : "";

  const clientId = configuredId || process.env[envKey(input.providerId, "CLIENT_ID")] || "";
  const clientSecret =
    configuredSecret || process.env[envKey(input.providerId, "CLIENT_SECRET")] || "";

  if (!clientId || !clientSecret) {
    throw new OAuthError(
      "not_configured",
      `${envKey(input.providerId, "CLIENT_ID")} and ${envKey(input.providerId, "CLIENT_SECRET")} must be set`,
    );
  }

  const redirectUri =
    process.env[envKey(input.providerId, "REDIRECT_URI")] ||
    `${input.origin}/api/oauth/${input.providerId}/callback`;

  return { clientId, clientSecret, redirectUri };
}
