/**
 * Identity linking and just-in-time provisioning.
 *
 * Identity key is (issuer, subject), never email: an IdP can change or recycle
 * an email address, while `sub` is stable. Email is only used to link an
 * existing local user when the provider proves it (email_verified) or the
 * operator opts into AUTH_TRUST_EMAIL. That is what prevents account takeover
 * by registering someone else's address at another IdP.
 *
 * A first login creates User + UserIdentity in one transaction. The first user
 * can become admin when AUTH_BOOTSTRAP_FIRST_USER is enabled and the table is
 * empty; otherwise the role comes from the IdP mapping.
 */
import { prisma } from "@/lib/db/client";
import type { ProvisioningSettings } from "./config";
import type { ResolvedProfile } from "./claims";
import type { Role } from "./session";

/** Account exists under another identity, or is disabled. Safe to show. */
export class AuthLinkError extends Error {}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  sessionVersion: number;
}

interface UpsertInput {
  issuer: string;
  subject: string;
  profile: ResolvedProfile;
  role: Role;
  config: ProvisioningSettings;
}

function toAuthUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  sessionVersion: number;
}): AuthUser {
  return { ...user, role: user.role as Role };
}

/**
 * Resolve the local user for a verified external identity.
 *
 * 1. Existing (issuer, subject) wins: refresh profile/role and last login.
 * 2. Otherwise, link by email only if the email is verified/trusted or the
 *    mapped role is admin. Unverified emails must not capture an account.
 * 3. Otherwise, provision a new user + identity atomically.
 *
 * The role is refreshed from the IdP on every login. Local edits to User.role
 * are intentionally overwritten.
 */
export async function upsertIdentityUser(input: UpsertInput): Promise<AuthUser> {
  const { issuer, subject, profile, config } = input;
  const existing = await prisma.userIdentity.findUnique({
    where: { provider_subject: { provider: issuer, subject } },
    include: { user: true },
  });

  if (existing) {
    if (!existing.user.isActive) throw new AuthLinkError("This account is disabled");
    const user = await prisma.user.update({
      where: { id: existing.userId },
      data: {
        email: profile.email,
        name: profile.name,
        role: input.role,
        lastLoginAt: new Date(),
      },
    });
    await prisma.userIdentity.update({
      where: { id: existing.id },
      data: { email: profile.email },
    });
    return toAuthUser(user);
  }

  const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    if (!canLinkByEmail(profile, config, input.role)) {
      throw new AuthLinkError(
        "An account with this email already exists. Ask an administrator to link your identity.",
      );
    }
    await prisma.userIdentity.create({
      data: { provider: issuer, subject, userId: byEmail.id, email: profile.email },
    });
    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: { role: input.role, lastLoginAt: new Date() },
    });
    return toAuthUser(user);
  }

  const role = await firstUserRole(input.role, config);
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        role,
        lastLoginAt: new Date(),
      },
    });
    await tx.userIdentity.create({
      data: { provider: issuer, subject, userId: user.id, email: profile.email },
    });
    return user;
  });
  return toAuthUser(created);
}

/**
 * Linking by email is the only place where email matters. It is allowed for a
 * verified/trusted email, or for an admin mapping (the operator explicitly
 * granted that address admin access). Everyone else gets the link error.
 */
function canLinkByEmail(
  profile: ResolvedProfile,
  config: ProvisioningSettings,
  role: Role,
): boolean {
  if (role === "admin") return true;
  return profile.emailVerified || config.trustEmail;
}

/**
 * Bootstrap escape hatch for a fresh instance: the very first viewer becomes
 * admin so the operator is not locked out. Once any user exists this is a no-op.
 */
async function firstUserRole(role: Role, config: ProvisioningSettings): Promise<Role> {
  if (role !== "viewer" || !config.bootstrapFirstUser) return role;
  const count = await prisma.user.count();
  return count === 0 ? "admin" : role;
}

/** Load an active local user for an existing session. */
export async function getActiveUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return toAuthUser(user);
}
