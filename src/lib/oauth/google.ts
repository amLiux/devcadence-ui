import type { OAuthProvider } from "./types";

export const GOOGLE_PROVIDER: OAuthProvider = {
  id: "google",
  connectionType: "Google",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  revokeUrl: "https://oauth2.googleapis.com/revoke",
  userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  baseScopes: ["openid", "email", "profile"],
};

export type GoogleService = "gmail" | "calendar" | "drive" | "sheets" | "docs";

/**
 * Least privilege per service. gmail.modify and calendar scopes are "restricted"
 * for Google verification purposes; drive.file is not, because it only covers
 * files the app created or the user explicitly picked.
 */
export const GOOGLE_SERVICE_SCOPES: Record<GoogleService, string[]> = {
  gmail: ["https://www.googleapis.com/auth/gmail.modify"],
  calendar: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ],
  drive: ["https://www.googleapis.com/auth/drive.file"],
  sheets: ["https://www.googleapis.com/auth/spreadsheets"],
  docs: ["https://www.googleapis.com/auth/documents"],
};

export function googleScopesForServices(services: GoogleService[]): string[] {
  const scopes = [...GOOGLE_PROVIDER.baseScopes];
  for (const service of services) {
    scopes.push(...GOOGLE_SERVICE_SCOPES[service]);
  }
  return Array.from(new Set(scopes));
}

/** access_type=offline is what makes Google return a refresh token at all. */
export const GOOGLE_AUTHORIZE_PARAMS: Record<string, string> = {
  access_type: "offline",
  include_granted_scopes: "true",
  prompt: "consent",
};
