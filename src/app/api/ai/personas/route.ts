import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    const body = await req.json();
    const { name, systemPrompt, tone, description } = body;

    if (!name || !systemPrompt) {
      return NextResponse.json({ error: "name and systemPrompt are required" }, { status: 400 });
    }

    const persona = await prisma.aIPersona.create({
      data: { name, systemPrompt, tone: tone || "", description: description || "" },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/personas error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create persona" }, { status: 500 });
  }
}
