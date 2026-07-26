import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const contexts = await prisma.aIContext.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(contexts);
  } catch (error) {
    console.error("GET /api/ai/context error:", error);
    return NextResponse.json({ error: "Failed to fetch contexts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, content, description } = body;

    if (!name || !content) {
      return NextResponse.json({ error: "name and content are required" }, { status: 400 });
    }

    const context = await prisma.aIContext.create({
      data: { name, content, description: description || "" },
    });

    return NextResponse.json(context, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/context error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create context" }, { status: 500 });
  }
}
