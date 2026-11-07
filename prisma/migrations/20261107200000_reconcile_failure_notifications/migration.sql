-- Reconcile the failure-notifications migration.
--
-- The migration 20261102064624_add_failure_notifications is empty, but the
-- objects it was meant to create reached development databases through
-- `prisma db push`. This migration makes a fresh replay produce the same
-- schema, so `migrate dev` stops reporting drift.
--
-- The last four indexes existed only in the database. They are declared in
-- schema.prisma now, so they stay managed instead of being dropped.

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT NOT NULL DEFAULT 'slack',
    "connectionId" TEXT,
    "target" TEXT NOT NULL DEFAULT '',
    "throttleMinutes" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WorkflowRun" ADD COLUMN "notifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_notifiedAt_idx" ON "WorkflowRun"("workflowId", "notifiedAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_startedAt_idx" ON "WorkflowRun"("startedAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_startedAt_idx" ON "WorkflowRun"("workflowId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkflowLog_startedAt_idx" ON "WorkflowLog"("startedAt");

-- CreateIndex
CREATE INDEX "WorkflowLog_status_nodeType_idx" ON "WorkflowLog"("status", "nodeType");
