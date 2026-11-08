import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

const createMemorySchema = z.object({
  name: z.string().min(1, "name is required"),
  content: z.string().min(1, "content is required"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const memories = await prisma.aIMemory.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(memories);
  } catch (error) {
    console.error("GET /api/ai/memory error:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, createMemorySchema);
    if (!parsed.ok) return parsed.response;

    const memory = await prisma.aIMemory.create({
      data: {
        name: parsed.data.name,
        content: parsed.data.content,
        description: parsed.data.description ?? "",
      },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/memory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create memory" },
      { status: 500 },
    );
  }
}
