import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

const createPromptSchema = z.object({
  name: z.string().min(1, "name is required"),
  template: z.string().min(1, "template is required"),
  description: z.string().optional(),
});

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
    const parsed = await readJsonBody(req, createPromptSchema);
    if (!parsed.ok) return parsed.response;

    const prompt = await prisma.aIPrompt.create({
      data: {
        name: parsed.data.name,
        template: parsed.data.template,
        description: parsed.data.description ?? "",
      },
    });

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/prompts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create prompt" },
      { status: 500 },
    );
  }
}
