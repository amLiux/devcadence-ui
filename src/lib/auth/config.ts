/**
 * Auth configuration resolver.
 *
 * Modes:
 * - disabled: no auth, routes are public (default for existing installs).
 * - oidc: redirect to a standards-compliant provider (SSO / BYO IdP).
 * - hortus: devcadence-branded password form backed by the Hortus API.
 *
 * Settings are read at request time so tests and `make` targets can override
 * process.env without rebuilding. Required values fail closed: enabling a mode
 * without its settings raises AuthConfigError instead of silently disabling
 * auth. That is deliberate: a typo must not turn into an open instance.
 */
export type AuthMode = "disabled" | "oidc" | "hortus";

export interface SessionSettings {
  sessionSecret: string;
  appUrl: string;
  sessionTtlSeconds: number;
  transactionTtlSeconds: number;
}

export interface RoleSettings {
  adminEmails: string[];
  adminGroups: string[];
}

export interface ProvisioningSettings {
  trustEmail: boolean;
  bootstrapFirstUser: boolean;
}

export interface RateLimitSettings {
  loginMaxAttempts: number;
  loginWindowSeconds: number;
}

export interface AuthConfig extends SessionSettings, RoleSettings, ProvisioningSettings {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  upstreamLogout: boolean;
}

export interface HortusConfig
  extends SessionSettings,
    RoleSettings,
    ProvisioningSettings,
    RateLimitSettings {
  apiUrl: string;
  service: string;
}

export class AuthConfigError extends Error {}

/** Read AUTH_MODE. Unknown or missing values are intentionally "disabled". */
export function getAuthMode(): AuthMode {
  if (process.env.AUTH_MODE === "oidc") return "oidc";
  if (process.env.AUTH_MODE === "hortus") return "hortus";
  return "disabled";
}

export function isAuthEnabled(): boolean {
  return getAuthMode() !== "disabled";
}

/** Fail closed when a mode is enabled but a required setting is missing. */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new AuthConfigError(`${name} is required for AUTH_MODE=${getAuthMode()}`);
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

function commonSettings(): SessionSettings & RoleSettings & ProvisioningSettings {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    sessionSecret: required("AUTH_SECRET"),
    appUrl,
    sessionTtlSeconds: positiveInt("AUTH_SESSION_TTL", 8 * 60 * 60),
    transactionTtlSeconds: positiveInt("AUTH_TRANSACTION_TTL", 10 * 60),
    adminEmails: list("AUTH_ADMIN_EMAILS"),
    adminGroups: list("AUTH_ADMIN_GROUPS"),
    trustEmail: process.env.AUTH_TRUST_EMAIL === "true",
    bootstrapFirstUser: process.env.AUTH_BOOTSTRAP_FIRST_USER !== "false",
  };
}

/** OIDC client settings. Throws AuthConfigError if the mode is not configured. */
export function getAuthConfig(): AuthConfig {
  const common = commonSettings();
  return {
    ...common,
    issuer: required("AUTH_OIDC_ISSUER").replace(/\/$/, ""),
    clientId: required("AUTH_OIDC_CLIENT_ID"),
    clientSecret: required("AUTH_OIDC_CLIENT_SECRET"),
    redirectUri: process.env.AUTH_REDIRECT_URI || `${common.appUrl}/api/auth/callback`,
    scopes: process.env.AUTH_OIDC_SCOPES || "openid profile email offline_access hc.permissions",
    upstreamLogout: process.env.AUTH_UPSTREAM_LOGOUT === "true",
  };
}

/** Hortus API BFF settings. Throws AuthConfigError when AUTH_API_URL is absent. */
export function getHortusConfig(): HortusConfig {
  return {
    ...commonSettings(),
    apiUrl: required("AUTH_API_URL").replace(/\/$/, ""),
    service: process.env.AUTH_API_SERVICE || "devcadence",
    loginMaxAttempts: positiveInt("AUTH_RATE_LIMIT_MAX", 5),
    loginWindowSeconds: positiveInt("AUTH_RATE_LIMIT_WINDOW", 300),
  };
}

export function tryGetAuthConfig(): AuthConfig | null {
  return getAuthMode() === "oidc" ? getAuthConfig() : null;
}

export function tryGetHortusConfig(): HortusConfig | null {
  return getAuthMode() === "hortus" ? getHortusConfig() : null;
}

/**
 * Session-only settings for the proxy and cookie verification. Returns null
 * when auth is disabled; it deliberately does not require OIDC/API fields.
 */
export function getSessionSettings(): SessionSettings | null {
  if (getAuthMode() === "oidc") return getAuthConfig();
  if (getAuthMode() === "hortus") return getHortusConfig();
  return null;
}
