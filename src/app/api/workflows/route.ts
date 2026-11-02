import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultProjectId, getProject } from "@/lib/db/projects";
import { serializeWorkflow } from "@/lib/workflows/serialize";

interface CreateWorkflowBody {
  name: string;
  description?: string;
  type?: string;
  projectId?: string;
}

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
        select: { id: true, name: true },
      });
      return NextResponse.json({ workflows });
    }

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
