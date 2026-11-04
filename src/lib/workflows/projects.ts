import type { Project } from "@/lib/types";

export interface ReusableWorkflow {
  id: string;
  name: string;
  projectId: string;
}

export interface ReusableWorkflowGroup {
  project: Project;
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
 * Groups reusable workflows for the Call Workflow picker. A workflow can only be
 * called from its own project or from Shared, so those are the only groups kept.
 * Without a current project (older data), every project is offered.
 */
export function groupReusableWorkflows(
  workflows: ReusableWorkflow[],
  projects: Project[],
  currentProjectId?: string | null,
): ReusableWorkflowGroup[] {
  let targets: Project[];

  if (currentProjectId) {
    const current = projects.find((project) => project.id === currentProjectId);
    const shared = projects.find((project) => project.isShared);
    targets = [];
    for (const project of [current, shared]) {
      if (project && !targets.some((target) => target.id === project.id)) {
        targets.push(project);
      }
    }
  } else {
    targets = projects;
  }

  return targets
    .map((project) => ({
      project,
      workflows: workflows.filter((workflow) => workflow.projectId === project.id),
    }))
    .filter((group) => group.workflows.length > 0);
}
