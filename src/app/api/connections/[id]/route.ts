import { NextResponse } from "next/server";
import { getConnection, updateConnection, deleteConnection } from "@/lib/db/connections";
import type { Connection } from "@/lib/types";

interface PutRequestBody {
  name?: string;
  description?: string;
  config?: Record<string, string>;
}

function toResponse(conn: NonNullable<Awaited<ReturnType<typeof getConnection>>>): Connection {
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteConnection(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/connections error:", error);
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as PutRequestBody;

    const connection = await updateConnection(id, body);
    return NextResponse.json(toResponse(connection));
  } catch (error) {
    console.error("PUT /api/connections error:", error);
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const connection = await getConnection(id);
    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }
    return NextResponse.json(toResponse(connection));
  } catch (error) {
    console.error("GET /api/connections/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch connection" }, { status: 500 });
  }
}
