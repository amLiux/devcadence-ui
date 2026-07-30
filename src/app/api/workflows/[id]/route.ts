import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Workflow, WorkflowStatus } from "@/lib/types";

interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  type?: string;
  nodes?: string;
  edges?: string;
  flowPath?: string;
  publish?: boolean;
  status?: WorkflowStatus;
}

function simplifyWorkflow(w: {
  id: string;
  name: string;
  description: string;
  type: string;
  nodes: string | null;
  edges: string | null;
  flowPath: string | null;
  publish: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Workflow {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    type: w.type,
    nodes: w.nodes,
    edges: w.edges,
    flowPath: w.flowPath,
    publish: w.publish,
    status: w.status as WorkflowStatus,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json(simplifyWorkflow(workflow));
  } catch (error) {
    console.error("GET /api/workflows/[id] error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateWorkflowBody;
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.nodes !== undefined && { nodes: body.nodes }),
        ...(body.edges !== undefined && { edges: body.edges }),
        ...(body.flowPath !== undefined && { flowPath: body.flowPath }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.publish !== undefined && {
          publish: body.publish,
          status: body.publish ? "active" : "draft",
        }),
      },
    });
    return NextResponse.json(simplifyWorkflow(workflow));
  } catch (error) {
    console.error("PUT /api/workflows/[id] error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update workflow" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.workflow.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "DELETE /api/workflows/[id] error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
