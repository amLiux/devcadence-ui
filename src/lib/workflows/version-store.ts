import type * as Prisma from "@/generated/prisma/internal/prismaNamespace";
import {
  buildSnapshot,
  MAX_VERSIONS,
  shouldCreateVersion,
  snapshotHash,
  type WorkflowSnapshot,
} from "./version";

type Tx = Prisma.TransactionClient;

type VersionSource = "save" | "restore";

interface VersionableWorkflow extends WorkflowSnapshot {
  id: string;
}

/**
 * Stores the workflow's current state as a version, unless the save is a no-op
 * or the state is already the newest stored version. Must run inside the same
 * transaction as the update it protects, so a failed save cannot leave a
 * phantom version behind.
 */
export async function recordVersion(
  tx: Tx,
  current: VersionableWorkflow,
  next: VersionableWorkflow,
  source: VersionSource,
) {
  const currentSnapshot = buildSnapshot(current);
  const hash = snapshotHash(currentSnapshot);

  const last = await tx.workflowVersion.findFirst({
    where: { workflowId: current.id },
    orderBy: { version: "desc" },
    select: { version: true, hash: true },
  });

  if (!shouldCreateVersion(currentSnapshot, buildSnapshot(next), last?.hash)) return null;

  const created = await tx.workflowVersion.create({
    data: {
      workflowId: current.id,
      version: (last?.version ?? 0) + 1,
      ...currentSnapshot,
      hash,
      source,
    },
  });

  await pruneVersions(tx, current.id);
  return created;
}

/** Keeps the newest MAX_VERSIONS rows for a workflow and deletes the rest. */
export async function pruneVersions(tx: Tx, workflowId: string): Promise<void> {
  const stale = await tx.workflowVersion.findMany({
    where: { workflowId },
    orderBy: { version: "desc" },
    skip: MAX_VERSIONS,
    select: { id: true },
  });

  if (stale.length === 0) return;

  await tx.workflowVersion.deleteMany({
    where: { id: { in: stale.map((version) => version.id) } },
  });
}
