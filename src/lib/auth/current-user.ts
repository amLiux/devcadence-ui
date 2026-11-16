import { cookies } from "next/headers";
import { getSessionSettings } from "./config";
import { SESSION_COOKIE, readSessionToken } from "./session";
import { getActiveUser, type AuthUser } from "./users";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const config = getSessionSettings();
  if (!config) return null;

  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE)?.value, config);
  if (!session) return null;

  const user = await getActiveUser(session.sub);
  if (!user || user.sessionVersion !== session.ver) return null;
  return user;
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === "admin";
}

export function canAuthor(user: AuthUser): boolean {
  return user.role === "admin" || user.role === "author";
}
