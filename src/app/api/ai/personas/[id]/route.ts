import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, systemPrompt, tone, description } = body;

    const persona = await prisma.aIPersona.update({
      where: { id },
      data: { name, systemPrompt, tone, description },
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error("PUT /api/ai/personas/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update persona" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aIPersona.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ai/personas/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete persona" }, { status: 500 });
  }
}
