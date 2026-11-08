import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

const createPersonaSchema = z.object({
  name: z.string().min(1, "name is required"),
  systemPrompt: z.string().min(1, "systemPrompt is required"),
  tone: z.string().optional(),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const personas = await prisma.aIPersona.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(personas);
  } catch (error) {
    console.error("GET /api/ai/personas error:", error);
    return NextResponse.json({ error: "Failed to fetch personas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, createPersonaSchema);
    if (!parsed.ok) return parsed.response;

    const persona = await prisma.aIPersona.create({
      data: {
        name: parsed.data.name,
        systemPrompt: parsed.data.systemPrompt,
        tone: parsed.data.tone ?? "",
        description: parsed.data.description ?? "",
      },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/personas error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create persona" },
      { status: 500 },
    );
  }
}
