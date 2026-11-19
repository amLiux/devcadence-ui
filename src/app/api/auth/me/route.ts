/**
 * Current session introspection.
 *
 * Returns the local user and role. The proxy only checks cookie integrity; this
 * endpoint is the DB-backed view used by the UI and by tests.
 */
import { NextResponse } from "next/server";
import { getAuthMode, isAuthEnabled } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET(): Promise<Response> {
  if (!isAuthEnabled()) {
    return NextResponse.json({ mode: getAuthMode(), user: null });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    mode: getAuthMode(),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
