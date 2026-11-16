export type AuthMode = "disabled" | "oidc";

export interface AuthConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
  redirectUri: string;
  appUrl: string;
  scopes: string;
  sessionTtlSeconds: number;
  transactionTtlSeconds: number;
  adminEmails: string[];
  adminGroups: string[];
  trustEmail: boolean;
  bootstrapFirstUser: boolean;
  upstreamLogout: boolean;
}

export class AuthConfigError extends Error {}

export function getAuthMode(): AuthMode {
  return process.env.AUTH_MODE === "oidc" ? "oidc" : "disabled";
}

export function isAuthEnabled(): boolean {
  return getAuthMode() === "oidc";
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new AuthConfigError(`${name} is required when AUTH_MODE=oidc`);
  return value;
}

function list(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function positiveInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getAuthConfig(): AuthConfig {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    issuer: required("AUTH_OIDC_ISSUER").replace(/\/$/, ""),
    clientId: required("AUTH_OIDC_CLIENT_ID"),
    clientSecret: required("AUTH_OIDC_CLIENT_SECRET"),
    sessionSecret: required("AUTH_SECRET"),
    redirectUri: process.env.AUTH_REDIRECT_URI || `${appUrl}/api/auth/callback`,
    appUrl,
    scopes: process.env.AUTH_OIDC_SCOPES || "openid profile email offline_access hc.permissions",
    sessionTtlSeconds: positiveInt("AUTH_SESSION_TTL", 8 * 60 * 60),
    transactionTtlSeconds: positiveInt("AUTH_TRANSACTION_TTL", 10 * 60),
    adminEmails: list("AUTH_ADMIN_EMAILS"),
    adminGroups: list("AUTH_ADMIN_GROUPS"),
    trustEmail: process.env.AUTH_TRUST_EMAIL === "true",
    bootstrapFirstUser: process.env.AUTH_BOOTSTRAP_FIRST_USER !== "false",
    upstreamLogout: process.env.AUTH_UPSTREAM_LOGOUT === "true",
  };
}

export function tryGetAuthConfig(): AuthConfig | null {
  return isAuthEnabled() ? getAuthConfig() : null;
}
