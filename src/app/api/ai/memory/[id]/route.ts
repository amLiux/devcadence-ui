import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

const updateMemorySchema = z.object({
  name: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = await readJsonBody(req, updateMemorySchema);
    if (!parsed.ok) return parsed.response;

    const memory = await prisma.aIMemory.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(memory);
  } catch (error) {
    console.error("PUT /api/ai/memory/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update memory" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aIMemory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ai/memory/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete memory" },
      { status: 500 },
    );
  }
}
