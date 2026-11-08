import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncSchedules, unregisterSchedule } from "@/lib/scheduler";
import { getProject } from "@/lib/db/projects";
import { recordVersion } from "@/lib/workflows/version-store";
import { serializeWorkflow } from "@/lib/workflows/serialize";
import type { WorkflowStatus } from "@/lib/types";

interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  type?: string;
  projectId?: string;
  nodes?: string;
  edges?: string;
  flowPath?: string;
  status?: WorkflowStatus;
}

function workflowFields(body: UpdateWorkflowBody) {
  return {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.projectId !== undefined && { projectId: body.projectId }),
    ...(body.nodes !== undefined && { nodes: body.nodes }),
    ...(body.edges !== undefined && { edges: body.edges }),
    ...(body.status !== undefined && { status: body.status }),
  };
}

function workflowUpdateFields(body: UpdateWorkflowBody) {
  return {
    ...workflowFields(body),
    ...(body.flowPath !== undefined && { flowPath: body.flowPath }),
  };
}

async function syncScheduleAfterUpdate(
  id: string,
  body: UpdateWorkflowBody,
  workflow: { status: string },
): Promise<void> {
  const shouldSync = body.status !== undefined || body.nodes !== undefined;
  if (!shouldSync) return;

  const status = body.status ?? (workflow.status as WorkflowStatus);
  if (status === "active") {
    await syncSchedules();
    return;
  }
  if (status === "paused" || status === "draft") {
    await unregisterSchedule(id);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json(serializeWorkflow(workflow));
  } catch (error) {
    console.error("GET /api/workflows/[id] error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateWorkflowBody;

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      body.name = body.name.trim();
    }

    const current = await prisma.workflow.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (body.projectId !== undefined) {
      const project = await getProject(body.projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 400 });
      }
    }

    // The version stores the state being replaced, so a restore is always
    // possible. It only lands when the content actually changed.
    const workflow = await prisma.$transaction(async (tx) => {
      const next = { ...current, ...workflowFields(body) };

      await recordVersion(tx, current, next, "save");

      return tx.workflow.update({
        where: { id },
        data: workflowUpdateFields(body),
      });
    });

    await syncScheduleAfterUpdate(id, body, workflow);

    return NextResponse.json(serializeWorkflow(workflow));
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
    await unregisterSchedule(id);
    await prisma.$transaction(async (tx) => {
      await tx.workflowLog.deleteMany({ where: { run: { workflowId: id } } });
      await tx.workflowRun.deleteMany({ where: { workflowId: id } });
      await tx.workflow.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "DELETE /api/workflows/[id] error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
