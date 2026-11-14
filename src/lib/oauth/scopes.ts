import { GOOGLE_SERVICE_SCOPES, type GoogleService } from "./google";
import type { OAuthProvider } from "./types";

export const GOOGLE_SERVICES: GoogleService[] = ["gmail", "calendar", "drive", "sheets", "docs"];

export function isGoogleService(value: string): value is GoogleService {
  return (GOOGLE_SERVICES as string[]).includes(value);
}

/**
 * Turns the services selected in the connection form into scopes.
 * Unknown services are ignored instead of failing the consent request.
 */
export function scopesForServices(provider: OAuthProvider, services: string[]): string[] {
  const known = services.filter(isGoogleService);
  if (provider.id === "google") {
    const scopes = [...provider.baseScopes];
    for (const service of known) {
      scopes.push(...GOOGLE_SERVICE_SCOPES[service]);
    }
    return Array.from(new Set(scopes));
  }
  return provider.baseScopes;
}
