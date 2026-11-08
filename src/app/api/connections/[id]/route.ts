import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/body";
import { getConnection, updateConnection, deleteConnection } from "@/lib/db/connections";
import type { Connection } from "@/lib/types";

const updateConnectionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

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
    const parsed = await readJsonBody(req, updateConnectionSchema);
    if (!parsed.ok) return parsed.response;

    const connection = await updateConnection(id, parsed.data);
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
