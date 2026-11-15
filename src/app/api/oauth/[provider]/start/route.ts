import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/oauth/authorize";
import { getOAuthProvider } from "@/lib/oauth";
import { resolveOAuthClient } from "@/lib/oauth/client";
import { GOOGLE_AUTHORIZE_PARAMS } from "@/lib/oauth/google";
import { oauthErrorRedirect, safeReturnTo } from "@/lib/oauth/redirect";
import { scopesForServices } from "@/lib/oauth/scopes";
import { createOAuthState } from "@/lib/oauth/state";
import { OAuthError } from "@/lib/oauth/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const provider = getOAuthProvider(providerId);

  if (!provider) {
    return oauthErrorRedirect({ origin: url.origin, returnTo, code: "unknown_provider" });
  }

  const services = (url.searchParams.get("services") ?? "").split(",").filter(Boolean);

  try {
    const client = resolveOAuthClient({ providerId, origin: url.origin });
    const state = createOAuthState({
      provider: providerId,
      connectionId: url.searchParams.get("connectionId") ?? "",
      returnTo,
      name: url.searchParams.get("name") ?? "",
      services,
    });

    return NextResponse.redirect(
      buildAuthorizeUrl({
        provider,
        clientId: client.clientId,
        redirectUri: client.redirectUri,
        scopes: scopesForServices(provider, services),
        state,
        extraParams: provider.id === "google" ? GOOGLE_AUTHORIZE_PARAMS : undefined,
      }),
    );
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : "not_configured";
    return oauthErrorRedirect({ origin: url.origin, returnTo, code });
  }
}
