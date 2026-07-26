import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Connection } from "@/lib/types";

interface PutRequestBody {
  name?: string;
  description?: string;
  config?: Record<string, string>;
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.connection.delete({ where: { id } });
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

    const connection = await prisma.connection.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.config !== undefined && { config: body.config }),
      },
    });

    const response: Connection = {
      id: connection.id,
      type: connection.type as Connection["type"],
      name: connection.name,
      description: connection.description,
      config: connection.config as Record<string, string>,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PUT /api/connections error:", error);
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 });
  }
}
