import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/body";
import { toClientConnection } from "@/lib/connections/serialize";
import { resolveRedactedConfig } from "@/lib/connections/redact";
import { getConnections, createConnection } from "@/lib/db/connections";

const createConnectionSchema = z.object({
  type: z.string().min(1, "type is required"),
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    const connections = await getConnections();
    return NextResponse.json(connections.map(toClientConnection));
  } catch (error) {
    console.error("GET /api/connections error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, createConnectionSchema);
    if (!parsed.ok) return parsed.response;

    const { type, name, description, config } = parsed.data;
    const connection = await createConnection({
      type,
      name,
      description,
      config: resolveRedactedConfig(config ?? {}, {}),
    });
    return NextResponse.json(toClientConnection(connection), { status: 201 });
  } catch (error) {
    console.error("POST /api/connections error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create connection" },
      { status: 500 },
    );
  }
}
