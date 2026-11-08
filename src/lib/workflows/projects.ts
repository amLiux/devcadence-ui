import type { Project } from "@/lib/types";

export interface ReusableWorkflow {
  id: string;
  name: string;
  projectId: string;
  projectName?: string;
  isShared?: boolean;
}

export interface ReusableWorkflowGroup {
  project: { id: string; name: string; isShared: boolean };
  workflows: ReusableWorkflow[];
}

/** Keeps the items that belong to a project, or everything when no project is selected. */
export function filterByProject<T extends { projectId: string }>(
  items: T[],
  projectId: string | null,
): T[] {
  return projectId ? items.filter((item) => item.projectId === projectId) : items;
}

/**
 * Where a new workflow should land: the project selected in the rail, or Shared
 * when the rail is on "All".
 */
export function defaultProjectId(
  projects: Project[],
  activeProjectId: string | null,
): string | undefined {
  return activeProjectId ?? projects.find((project) => project.isShared)?.id;
}

/**
 * Groups the compact reusable workflow list for the Call Workflow picker. A
 * workflow can only be called from its own project or from Shared, so those are
 * the only groups kept. Without a current project, every project is offered.
 *
 * The list already carries projectName and isShared, so this does not need the
 * full projects payload.
 */
export function groupReusableWorkflows(
  workflows: ReusableWorkflow[],
  currentProjectId?: string | null,
): ReusableWorkflowGroup[] {
  const groups = new Map<string, ReusableWorkflowGroup>();

  for (const workflow of workflows) {
    if (currentProjectId && workflow.projectId !== currentProjectId && !workflow.isShared) {
      continue;
    }

    const existing = groups.get(workflow.projectId);
    if (existing) {
      existing.workflows.push(workflow);
      continue;
    }

    groups.set(workflow.projectId, {
      project: {
        id: workflow.projectId,
        name: workflow.projectName ?? workflow.projectId,
        isShared: Boolean(workflow.isShared),
      },
      workflows: [workflow],
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (!currentProjectId) return 0;
    if (a.project.id === currentProjectId) return -1;
    if (b.project.id === currentProjectId) return 1;
    if (a.project.isShared && !b.project.isShared) return -1;
    if (!a.project.isShared && b.project.isShared) return 1;
    return 0;
  });
}
