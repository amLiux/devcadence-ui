-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN "projectId" TEXT;

-- Seed the shared project and backfill every existing workflow into it
INSERT INTO "Project" ("id", "name", "description", "isShared", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Shared', 'Reusable workflows and utilities', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "Workflow"
SET "projectId" = (SELECT "id" FROM "Project" WHERE "isShared" = true LIMIT 1);

-- AlterTable
ALTER TABLE "Workflow" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Workflow_projectId_idx" ON "Workflow"("projectId");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
