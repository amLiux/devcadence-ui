import { NextResponse } from "next/server";
import { getConnections, createConnection } from "@/lib/db/connections";
import type { Connection } from "@/lib/types";

interface ConnectionRequestBody {
  type: string;
  name: string;
  description?: string;
  config: Record<string, string>;
}

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
    const body = (await req.json()) as ConnectionRequestBody;
    const { type, name, description, config } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "type and name are required" }, { status: 400 });
    }

    const connection = await createConnection({ type, name, description, config: config || {} });
    return NextResponse.json(toResponse(connection), { status: 201 });
  } catch (error) {
    console.error("POST /api/connections error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create connection" },
      { status: 500 },
    );
  }
}
