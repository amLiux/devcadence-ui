import { NextResponse } from "next/server";
import { sendTestNotification } from "@/lib/notifications/notify";

export async function POST() {
  try {
    await sendTestNotification();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test notification";
    console.error("POST /api/settings/notifications/test error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
