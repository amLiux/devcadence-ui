import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/body";
import { disconnectConnection, refreshConnection } from "@/lib/oauth/connection-service";
import { OAuthError } from "@/lib/oauth/types";

const actionSchema = z.object({
  action: z.enum(["refresh", "disconnect"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await readJsonBody(request, actionSchema);
  if (!parsed.ok) return parsed.response;

  const origin = new URL(request.url).origin;

  try {
    if (parsed.data.action === "refresh") {
      return NextResponse.json({ ok: true, ...(await refreshConnection({ id, origin })) });
    }
    return NextResponse.json({ ok: true, ...(await disconnectConnection({ id, origin })) });
  } catch (error) {
    if (error instanceof OAuthError) {
      const status = error.code === "reconnect_required" ? 409 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "OAuth request failed" }, { status: 500 });
  }
}
