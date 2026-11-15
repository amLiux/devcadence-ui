import type { OAuthProvider } from "./types";

export function buildAuthorizeUrl(input: {
  provider: OAuthProvider;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  extraParams?: Record<string, string>;
}): string {
  const url = new URL(input.provider.authorizeUrl);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", Array.from(new Set(input.scopes)).join(" "));
  url.searchParams.set("state", input.state);

  for (const [key, value] of Object.entries(input.extraParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
