import { NextResponse } from "next/server";
import { parseRetryPolicy } from "@/lib/workflows/retry-config";
import { loadRetryPolicy, saveRetryPolicy } from "@/lib/workflows/retry-store";

export async function GET() {
  try {
    return NextResponse.json(await loadRetryPolicy());
  } catch (error) {
    console.error(
      "GET /api/settings/runs error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to load retry settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const parsed = parseRetryPolicy(await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    return NextResponse.json(await saveRetryPolicy(parsed.value));
  } catch (error) {
    console.error(
      "PUT /api/settings/runs error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to save retry settings" }, { status: 500 });
  }
}
