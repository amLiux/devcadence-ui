import { getOAuthProvider } from "@/lib/oauth";
import { resolveOAuthClient } from "@/lib/oauth/client";
import { oauthErrorRedirect, oauthRedirect, safeReturnTo } from "@/lib/oauth/redirect";
import { scopesForServices } from "@/lib/oauth/scopes";
import { verifyOAuthState } from "@/lib/oauth/state";
import { tokensToConfig } from "@/lib/oauth/storage";
import { exchangeAuthorizationCode, fetchOAuthProfile } from "@/lib/oauth/tokens";
import { OAuthError } from "@/lib/oauth/types";
import { createConnection, getConnection, updateConnection } from "@/lib/db/connections";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const url = new URL(request.url);
  const provider = getOAuthProvider(providerId);
  const state = verifyOAuthState(url.searchParams.get("state") ?? "");

  if (!provider) {
    return oauthErrorRedirect({ origin: url.origin, returnTo: "/connections", code: "unknown_provider" });
  }
  if (!state || state.provider !== providerId) {
    return oauthErrorRedirect({
      origin: url.origin,
      returnTo: safeReturnTo(state?.returnTo),
      code: "invalid_state",
    });
  }

  const returnTo = safeReturnTo(state.returnTo);
  if (url.searchParams.get("error")) {
    return oauthErrorRedirect({ origin: url.origin, returnTo, code: "consent_denied" });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return oauthErrorRedirect({ origin: url.origin, returnTo, code: "exchange_failed" });
  }

  try {
    const client = resolveOAuthClient({ providerId, origin: url.origin });
    const tokens = await exchangeAuthorizationCode({
      provider,
      client,
      code,
      scopes: scopesForServices(provider, state.services),
    });
    const profile = await fetchOAuthProfile({ provider, accessToken: tokens.accessToken });
    const config = {
      ...tokensToConfig(tokens),
      provider: provider.id,
      email: profile.email,
      services: state.services.join(" "),
      authorizedAt: new Date().toISOString(),
    };

    if (state.connectionId) {
      const existing = await getConnection(state.connectionId);
      if (existing) {
        await updateConnection(state.connectionId, {
          config: { ...existing.config, ...config },
        });
      }
    } else {
      await createConnection({
        type: provider.connectionType,
        name: state.name.trim() || `${provider.connectionType} (${profile.email})`,
        description: `Authorized as ${profile.email}`,
        config,
      });
    }

    return oauthRedirect({ origin: url.origin, returnTo, params: { oauth: "connected" } });
  } catch (error) {
    const code2 = error instanceof OAuthError ? error.code : "exchange_failed";
    return oauthErrorRedirect({ origin: url.origin, returnTo, code: code2 });
  }
}
