import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/body";
import { deleteProjectAndReassign, getProject, updateProject } from "@/lib/db/projects";
import { serializeProject } from "@/lib/projects/serialize";

const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  description: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = await readJsonBody(req, updateProjectSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await getProject(id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = await updateProject(id, parsed.data);
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
