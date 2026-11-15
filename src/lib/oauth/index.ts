import { GOOGLE_PROVIDER } from "./google";
import type { OAuthProvider } from "./types";

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: GOOGLE_PROVIDER,
};

export function getOAuthProvider(id: string): OAuthProvider | null {
  return OAUTH_PROVIDERS[id] ?? null;
}

export { buildAuthorizeUrl } from "./authorize";
export {
  GOOGLE_AUTHORIZE_PARAMS,
  GOOGLE_PROVIDER,
  GOOGLE_SERVICE_SCOPES,
  googleScopesForServices,
  type GoogleService,
} from "./google";
export {
  OAUTH_CONFIG_KEYS,
  OAUTH_SECRET_KEYS,
  tokensFromConfig,
  tokensToConfig,
} from "./storage";
export { createOAuthState, verifyOAuthState, STATE_TTL_MS, type OAuthStatePayload } from "./state";
export {
  exchangeAuthorizationCode,
  fetchOAuthProfile,
  isExpiring,
  refreshAccessToken,
  revokeOAuthToken,
} from "./tokens";
export {
  EXPIRY_SKEW_MS,
  OAuthError,
  type OAuthClient,
  type OAuthErrorCode,
  type OAuthProfile,
  type OAuthProvider,
  type OAuthTokens,
} from "./types";
