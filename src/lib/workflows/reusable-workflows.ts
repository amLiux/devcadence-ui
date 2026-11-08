import type { ReusableWorkflow } from "./projects";

const REUSABLE_WORKFLOWS_TTL_MS = 60_000;

let cache: { at: number; workflows: ReusableWorkflow[] } | null = null;

/**
 * Fetches the compact reusable workflow list shared by the Call Workflow picker
 * and the node cards, reusing a one-minute cache.
 */
export async function fetchReusableWorkflows(): Promise<ReusableWorkflow[]> {
  if (cache && Date.now() - cache.at < REUSABLE_WORKFLOWS_TTL_MS) {
    return cache.workflows;
  }

  const res = await fetch("/api/workflows?type=sub-workflow&compact=1");
  const data = (await res.json()) as { workflows?: ReusableWorkflow[] };
  const workflows = data.workflows ?? [];

  cache = { at: Date.now(), workflows };
  return workflows;
}
