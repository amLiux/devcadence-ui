import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/body";
import { createProject, getProjects } from "@/lib/db/projects";
import { serializeProject } from "@/lib/projects/serialize";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json({ projects: projects.map(serializeProject) });
  } catch (error) {
    console.error("GET /api/projects error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, createProjectSchema);
    if (!parsed.ok) return parsed.response;

    const project = await createProject({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
    });

    return NextResponse.json(serializeProject(project), { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
