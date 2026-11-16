import { prisma } from "@/lib/db/client";
import type { AuthConfig } from "./config";
import type { ResolvedProfile } from "./claims";
import type { Role } from "./session";

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
  config: AuthConfig;
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

function canLinkByEmail(profile: ResolvedProfile, config: AuthConfig, role: Role): boolean {
  if (role === "admin") return true;
  return profile.emailVerified || config.trustEmail;
}

async function firstUserRole(role: Role, config: AuthConfig): Promise<Role> {
  if (role !== "viewer" || !config.bootstrapFirstUser) return role;
  const count = await prisma.user.count();
  return count === 0 ? "admin" : role;
}

export async function getActiveUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return toAuthUser(user);
}
