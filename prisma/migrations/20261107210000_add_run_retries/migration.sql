-- Run-level retries: attempt number, link to the previous attempt and the next
-- automatic retry timestamp.

ALTER TABLE "WorkflowRun"
  ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "retryOfRunId" TEXT,
  ADD COLUMN "nextRetryAt" TIMESTAMP(3);

CREATE INDEX "WorkflowRun_status_nextRetryAt_idx" ON "WorkflowRun"("status", "nextRetryAt");
CREATE INDEX "WorkflowRun_retryOfRunId_idx" ON "WorkflowRun"("retryOfRunId");

ALTER TABLE "WorkflowRun"
  ADD CONSTRAINT "WorkflowRun_retryOfRunId_fkey"
  FOREIGN KEY ("retryOfRunId") REFERENCES "WorkflowRun"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
