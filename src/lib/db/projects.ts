import { prisma } from "./client";

export function getProjects() {
  return prisma.project.findMany({
    orderBy: [{ isShared: "desc" }, { name: "asc" }],
    include: { _count: { select: { workflows: true } } },
  });
}

export function getProject(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

export function getSharedProject() {
  return prisma.project.findFirst({ where: { isShared: true } });
}

/** Falls back to the shared project when a workflow is created without one. */
export async function getDefaultProjectId(): Promise<string> {
  const shared = await getSharedProject();
  if (!shared) throw new Error("The shared project is missing");
  return shared.id;
}

export function createProject(data: { name: string; description?: string }) {
  return prisma.project.create({
    data: { name: data.name, description: data.description ?? "" },
  });
}

export function updateProject(
  id: string,
  data: { name?: string; description?: string },
) {
  return prisma.project.update({ where: { id }, data });
}

/**
 * Moves every workflow of the project into Shared before deleting it, so a
 * project can never take its workflows down with it.
 */
export async function deleteProjectAndReassign(id: string) {
  return prisma.$transaction(async (tx) => {
    const shared = await tx.project.findFirst({ where: { isShared: true } });
    if (!shared) throw new Error("The shared project is missing");

    await tx.workflow.updateMany({
      where: { projectId: id },
      data: { projectId: shared.id },
    });

    return tx.project.delete({ where: { id } });
  });
}
