export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  attempt?: number;
  retryOfRunId?: string | null;
}

export interface WorkflowLog {
  id: string;
  nodeId: string;
  nodeType: string;
  stepNr: number;
  status: string;
  error: string | null;
  elapsedMs: number;
  startedAt: string;
  finishedAt: string;
  meta: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  input: Record<string, unknown> | null;
  controlFlow: Record<string, unknown> | null;
}
