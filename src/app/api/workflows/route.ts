import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeWorkflow } from "@/lib/workflows/serialize";

interface CreateWorkflowBody {
  name: string;
  description?: string;
  type?: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const where = type ? { type } : undefined;

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ workflows: workflows.map(serializeWorkflow) });
  } catch (error) {
    console.error("GET /api/workflows error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateWorkflowBody;
    const workflow = await prisma.workflow.create({
      data: {
        name: body.name || "Untitled Workflow",
        description: body.description || "",
        type: body.type || "workflow",
      },
    });
    return NextResponse.json(serializeWorkflow(workflow), { status: 201 });
  } catch (error) {
    console.error("POST /api/workflows error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workflow" },
      { status: 500 },
    );
  }
}
