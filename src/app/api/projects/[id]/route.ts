import { NextResponse } from "next/server";
import { deleteProjectAndReassign, getProject, updateProject } from "@/lib/db/projects";
import { serializeProject } from "@/lib/projects/serialize";

interface UpdateProjectBody {
  name?: string;
  description?: string;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateProjectBody;

    const existing = await getProject(id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (body.name !== undefined && (!body.name.trim() || typeof body.name !== "string")) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await updateProject(id, {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description }),
    });

    return NextResponse.json(serializeProject(project));
  } catch (error) {
    console.error("PUT /api/projects/[id] error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.isShared) {
      return NextResponse.json(
        { error: "The shared project cannot be deleted" },
        { status: 400 },
      );
    }

    await deleteProjectAndReassign(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
