-- CreateTable
CREATE TABLE "TriggerState" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastValue" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriggerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TriggerState_workflowId_triggerType_key_key" ON "TriggerState"("workflowId", "triggerType", "key");
