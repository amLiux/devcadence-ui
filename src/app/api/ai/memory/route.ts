import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    const body = await req.json();
    const { name, content, description } = body;

    if (!name || !content) {
      return NextResponse.json({ error: "name and content are required" }, { status: 400 });
    }

    const memory = await prisma.aIMemory.create({
      data: { name, content, description: description || "" },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/memory error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create memory" }, { status: 500 });
  }
}
