import type { Workflow, WorkflowStatus } from "@/lib/types";

interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  type: string;
  projectId: string;
  nodes: string | null;
  edges: string | null;
  flowPath: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Converts a Prisma workflow row into the JSON shape the client expects. */
export function serializeWorkflow(workflow: WorkflowRow): Workflow {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    type: workflow.type,
    projectId: workflow.projectId,
    nodes: workflow.nodes,
    edges: workflow.edges,
    flowPath: workflow.flowPath,
    status: workflow.status as WorkflowStatus,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  };
}
