import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db/connections";
import { isTestable, testConnectionConfig } from "@/lib/connections/test";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const connection = await getConnection(id);

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    if (!isTestable(connection.type)) {
      return NextResponse.json(
        { error: `${connection.type} connections cannot be tested` },
        { status: 400 },
      );
    }

    const result = await testConnectionConfig({
      type: connection.type,
      config: connection.config,
    });

    // A failed probe is still a successful request: the UI shows it inline.
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "POST /api/connections/[id]/test error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to test connection" }, { status: 500 });
  }
}
