import { NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET(): Promise<Response> {
  if (!isAuthEnabled()) {
    return NextResponse.json({ mode: "disabled", user: null });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    mode: "oidc",
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
