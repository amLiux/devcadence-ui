import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db/connections";
import { getNotificationSettings, saveNotificationSettings } from "@/lib/notifications/notify";
import { CHANNEL_CONNECTION_TYPE, parseNotificationSettings } from "@/lib/notifications/settings";

export async function GET() {
  try {
    return NextResponse.json(await getNotificationSettings());
  } catch (error) {
    console.error(
      "GET /api/settings/notifications error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to load notification settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const parsed = parseNotificationSettings(await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { value } = parsed;

    if (value.connectionId) {
      const connection = await getConnection(value.connectionId);
      if (!connection) {
        return NextResponse.json({ error: "Connection not found" }, { status: 400 });
      }

      const expected = CHANNEL_CONNECTION_TYPE[value.channel];
      if (connection.type !== expected) {
        return NextResponse.json(
          { error: `Select a ${expected} connection for this channel` },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(await saveNotificationSettings(value));
  } catch (error) {
    console.error(
      "PUT /api/settings/notifications error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to save notification settings" }, { status: 500 });
  }
}
