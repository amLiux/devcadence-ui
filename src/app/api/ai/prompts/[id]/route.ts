import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

const updatePromptSchema = z.object({
  name: z.string().optional(),
  template: z.string().optional(),
  description: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = await readJsonBody(req, updatePromptSchema);
    if (!parsed.ok) return parsed.response;

    const prompt = await prisma.aIPrompt.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error("PUT /api/ai/prompts/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update prompt" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aIPrompt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ai/prompts/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete prompt" },
      { status: 500 },
    );
  }
}
