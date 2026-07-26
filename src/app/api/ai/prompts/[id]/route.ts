import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, template, description } = body;

    const prompt = await prisma.aIPrompt.update({
      where: { id },
      data: { name, template, description },
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error("PUT /api/ai/prompts/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update prompt" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aIPrompt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ai/prompts/[id] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete prompt" }, { status: 500 });
  }
}
