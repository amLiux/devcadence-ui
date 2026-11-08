import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";
import { getDefaultProjectId, getProject } from "@/lib/db/projects";
import { serializeWorkflow } from "@/lib/workflows/serialize";

const createWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  projectId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const projectId = searchParams.get("projectId");
    const compact = searchParams.get("compact") === "1";

    const where = {
      ...(type ? { type } : {}),
      ...(projectId ? { projectId } : {}),
    };

    // Callers that only need a picker (Call Workflow, node previews) should not
    // pay for every workflow's nodes and edges.
    if (compact) {
      const workflows = await prisma.workflow.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          projectId: true,
          project: { select: { name: true, isShared: true } },
        },
      });
      return NextResponse.json({
        workflows: workflows.map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          projectId: workflow.projectId,
          projectName: workflow.project.name,
          isShared: workflow.project.isShared,
        })),
      });
    }

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { project: { select: { name: true } } },
    });
    return NextResponse.json({ workflows: workflows.map(serializeWorkflow) });
  } catch (error) {
    console.error("GET /api/workflows error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, createWorkflowSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    let projectId = body.projectId;
    if (projectId) {
      const project = await getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 400 });
      }
    } else {
      projectId = await getDefaultProjectId();
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: body.name || "Untitled Workflow",
        description: body.description || "",
        type: body.type || "workflow",
        projectId,
      },
      include: { project: { select: { name: true } } },
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
