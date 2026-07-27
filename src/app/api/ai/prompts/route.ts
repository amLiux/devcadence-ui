import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const prompts = await prisma.aIPrompt.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(prompts);
  } catch (error) {
    console.error("GET /api/ai/prompts error:", error);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, template, description } = body;

    if (!name || !template) {
      return NextResponse.json({ error: "name and template are required" }, { status: 400 });
    }

    const prompt = await prisma.aIPrompt.create({
      data: { name, template, description: description || "" },
    });

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/prompts error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create prompt" }, { status: 500 });
  }
}
