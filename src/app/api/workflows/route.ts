import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Workflow } from "@/lib/types";

interface CreateWorkflowBody {
  name: string;
  description?: string;
}

function simplifyWorkflow(w: {
  id: string;
  name: string;
  description: string;
  nodes: string | null;
  edges: string | null;
  flowPath: string | null;
  publish: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Workflow {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    nodes: w.nodes,
    edges: w.edges,
    flowPath: w.flowPath,
    publish: w.publish,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(workflows.map(simplifyWorkflow));
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
      },
    });
    return NextResponse.json(simplifyWorkflow(workflow), { status: 201 });
  } catch (error) {
    console.error("POST /api/workflows error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workflow" },
      { status: 500 },
    );
  }
}
