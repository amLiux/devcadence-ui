/**
 * Normalize IdP claims into a single effective role.
 *
 * Precedence (highest wins):
 *   admin email > admin group > admin permission > author permission > viewer
 *
 * Permissions are additive, so one role is enough. Hortus exposes them as
 * `hc.permissions` scoped to the client's service, plus `iam` for super-admins.
 * Email/groups are used for role mapping only; identity is always (issuer, sub).
 */
import type { RoleSettings } from "./config";
import type { IdTokenClaims } from "./oidc";
import type { Role } from "./session";

// Actions that imply full control of the tenant. Keep in sync with the docs
// table in /docs/byo-idp and AUTH.md.
const ADMIN_PERMISSIONS = new Set([
  "admin",
  "manage_service",
  "manage_roles",
  "manage_users",
  "manage_workflows",
]);
const AUTHOR_PERMISSIONS = new Set(["run_workflows", "edit_workflows"]);

export interface ResolvedProfile {
  email: string;
  emailVerified: boolean;
  name: string;
  groups: string[];
  permissions: string[];
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Extract the profile needed for provisioning and role mapping.
 *
 * ID token claims are preferred; userinfo fills gaps and provides
 * `hc.permissions`. A missing email is fatal because it is the only fallback
 * for linking and display, but it is never treated as the identity key.
 */
export function extractProfile(
  claims: IdTokenClaims,
  userInfo: Record<string, unknown> | null,
): ResolvedProfile {
  const email = String(claims.email ?? userInfo?.email ?? claims.preferred_username ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("The identity provider did not return an email address");
  }

  const groups = stringArray(claims.groups ?? userInfo?.groups).map((group) => group.toLowerCase());
  const permissions = stringArray(userInfo?.["hc.permissions"]);

  return {
    email,
    emailVerified: claims.email_verified === true || userInfo?.email_verified === true,
    name: displayName(claims, userInfo, email),
    groups,
    permissions,
  };
}

function displayName(
  claims: IdTokenClaims,
  userInfo: Record<string, unknown> | null,
  email: string,
): string {
  const full = [claims.given_name, claims.family_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  const name = claims.name ?? userInfo?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return email.split("@")[0];
}

/**
 * Map a profile to one role. Order is deliberate: an explicit admin email or
 * group overrides permissions, and admin permissions override author ones.
 */
export function resolveRole(profile: ResolvedProfile, config: RoleSettings): Role {
  const groups = new Set(profile.groups);
  if (config.adminEmails.includes(profile.email)) return "admin";
  if (config.adminGroups.some((group) => groups.has(group))) return "admin";
  if (profile.permissions.some((permission) => ADMIN_PERMISSIONS.has(permission))) return "admin";
  if (profile.permissions.some((permission) => AUTHOR_PERMISSIONS.has(permission))) return "author";
  return "viewer";
}

/** True when `role` is one of the allowed roles. */
export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}
