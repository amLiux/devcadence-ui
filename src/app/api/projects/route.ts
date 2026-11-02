import { NextResponse } from "next/server";
import { createProject, getProjects } from "@/lib/db/projects";
import { serializeProject } from "@/lib/projects/serialize";

interface CreateProjectBody {
  name?: string;
  description?: string;
}

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
    const body = (await req.json()) as CreateProjectBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await createProject({
      name,
      description: typeof body.description === "string" ? body.description : "",
    });

    return NextResponse.json(serializeProject(project), { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
