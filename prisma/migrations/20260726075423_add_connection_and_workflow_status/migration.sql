/*
  Warnings:

  - You are about to drop the `RepoSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Repository` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RepoSetting" DROP CONSTRAINT "RepoSetting_repoId_fkey";

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- DropTable
DROP TABLE "RepoSetting";

-- DropTable
DROP TABLE "Repository";

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);
