/** Provider-agnostic OAuth2 types. Google is the first provider; Microsoft Graph reuses these. */

export interface OAuthProvider {
  /** Stable id, also used as the connection type discriminator (paperless: "google"). */
  id: string;
  /** Connection type this provider authorizes, e.g. "Google". */
  connectionType: string;
  authorizeUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl: string;
  /** Scopes always requested, independent of the selected services (usually openid/email/profile). */
  baseScopes: string[];
}

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  scopes: string[];
  tokenType: string;
}

export interface OAuthProfile {
  email: string;
  subject: string;
}

export type OAuthErrorCode =
  | "consent_denied"
  | "invalid_state"
  | "exchange_failed"
  | "refresh_failed"
  | "reconnect_required"
  | "profile_failed"
  | "revoke_failed"
  | "not_configured"
  | "unknown_provider";

export class OAuthError extends Error {
  readonly code: OAuthErrorCode;

  constructor(code: OAuthErrorCode, message: string) {
    super(message);
    this.name = "OAuthError";
    this.code = code;
  }
}

/** Refresh this long before the token actually expires. */
export const EXPIRY_SKEW_MS = 60_000;
