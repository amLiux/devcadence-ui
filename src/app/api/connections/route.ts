import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/body";
import { getConnections, createConnection } from "@/lib/db/connections";
import type { Connection } from "@/lib/types";

const createConnectionSchema = z.object({
  type: z.string().min(1, "type is required"),
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

function toResponse(conn: Awaited<ReturnType<typeof getConnections>>[number]): Connection {
  return {
    id: conn.id,
    type: conn.type as Connection["type"],
    name: conn.name,
    description: conn.description,
    config: conn.config as Record<string, string>,
    createdAt: conn.createdAt.toISOString(),
    updatedAt: conn.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const connections = await getConnections();
    return NextResponse.json(connections.map(toResponse));
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
      config: config ?? {},
    });
    return NextResponse.json(toResponse(connection), { status: 201 });
  } catch (error) {
    console.error("POST /api/connections error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create connection" },
      { status: 500 },
    );
  }
}
