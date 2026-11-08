import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

const createContextSchema = z.object({
  name: z.string().min(1, "name is required"),
  content: z.string().min(1, "content is required"),
  description: z.string().optional(),
});

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
    const parsed = await readJsonBody(req, createContextSchema);
    if (!parsed.ok) return parsed.response;

    const context = await prisma.aIContext.create({
      data: {
        name: parsed.data.name,
        content: parsed.data.content,
        description: parsed.data.description ?? "",
      },
    });

    return NextResponse.json(context, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/context error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create context" },
      { status: 500 },
    );
  }
}
