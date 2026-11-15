import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/body";
import { toClientConnection } from "@/lib/connections/serialize";
import { resolveRedactedConfig } from "@/lib/connections/redact";
import { getConnection, updateConnection, deleteConnection } from "@/lib/db/connections";

const updateConnectionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

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

    const existing = await getConnection(id);
    if (!existing) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const connection = await updateConnection(id, {
      ...parsed.data,
      ...(parsed.data.config !== undefined && {
        config: resolveRedactedConfig(parsed.data.config, existing.config),
      }),
    });
    return NextResponse.json(toClientConnection(connection));
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
    return NextResponse.json(toClientConnection(connection));
  } catch (error) {
    console.error("GET /api/connections/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch connection" }, { status: 500 });
  }
}
