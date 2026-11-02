-- CreateIndex
CREATE INDEX "WorkflowLog_status_nodeType_idx" ON "WorkflowLog"("status", "nodeType");

-- CreateIndex
CREATE INDEX "WorkflowLog_startedAt_idx" ON "WorkflowLog"("startedAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_startedAt_idx" ON "WorkflowRun"("startedAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_startedAt_idx" ON "WorkflowRun"("workflowId", "startedAt");
