import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, content, description } = body;

    const memory = await prisma.aIMemory.update({
      where: { id },
      data: { name, content, description },
    });

    return NextResponse.json(memory);
  } catch (error) {
    console.error("PUT /api/ai/memory/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update memory" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aIMemory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ai/memory/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete memory" }, { status: 500 });
  }
}
