import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

const updatePersonaSchema = z.object({
  name: z.string().optional(),
  systemPrompt: z.string().optional(),
  tone: z.string().optional(),
  description: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = await readJsonBody(req, updatePersonaSchema);
    if (!parsed.ok) return parsed.response;

    const persona = await prisma.aIPersona.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error("PUT /api/ai/personas/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update persona" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aIPersona.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ai/personas/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete persona" },
      { status: 500 },
    );
  }
}
