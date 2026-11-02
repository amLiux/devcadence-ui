import type { Project } from "@/lib/types";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { workflows: number };
}

/** Converts a Prisma project row into the JSON shape the client expects. */
export function serializeProject(project: ProjectRow): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    isShared: project.isShared,
    ...(project._count ? { workflowCount: project._count.workflows } : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
