import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, content, description } = body;

    const context = await prisma.aIContext.update({
      where: { id },
      data: { name, content, description },
    });

    return NextResponse.json(context);
  } catch (error) {
    console.error("PUT /api/ai/context/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update context" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aIContext.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ai/context/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete context" }, { status: 500 });
  }
}
