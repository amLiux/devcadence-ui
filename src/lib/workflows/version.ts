import { createHash } from "node:crypto";

/** How many versions are kept per workflow. Older ones are pruned on save. */
export const MAX_VERSIONS = 25;

/** Default page size for the version history list. */
export const VERSIONS_PAGE_SIZE = 10;

export interface WorkflowSnapshot {
  name: string;
  description: string;
  type: string;
  nodes: string | null;
  edges: string | null;
  status: string;
}

/** Picks the restorable fields out of a workflow row. */
export function buildSnapshot(workflow: WorkflowSnapshot): WorkflowSnapshot {
  return {
    name: workflow.name,
    description: workflow.description ?? "",
    type: workflow.type ?? "workflow",
    nodes: workflow.nodes ?? null,
    edges: workflow.edges ?? null,
    status: workflow.status ?? "draft",
  };
}

/**
 * Stable hash of a snapshot. Uses a fixed field order so two snapshots with the
 * same content always produce the same hash, no matter how the object was built.
 */
export function snapshotHash(snapshot: WorkflowSnapshot): string {
  const canonical = JSON.stringify([
    snapshot.name,
    snapshot.description,
    snapshot.type,
    snapshot.nodes ?? "",
    snapshot.edges ?? "",
    snapshot.status,
  ]);

  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * A version is only worth storing when the save actually changes something and
 * the state being replaced is not already the last stored version. Saving twice
 * without touching the canvas must not create noise.
 */
export function shouldCreateVersion(
  current: WorkflowSnapshot,
  next: WorkflowSnapshot,
  lastHash?: string | null,
): boolean {
  const currentHash = snapshotHash(current);
  if (currentHash === snapshotHash(next)) return false;
  return currentHash !== (lastHash ?? null);
}
