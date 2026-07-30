import { prisma } from "./client";
import type * as Prisma from "@/generated/prisma/internal/prismaNamespace";

export function getWorkflow(id: string) {
  return prisma.workflow.findUnique({ where: { id } });
}

export function getWorkflows(type?: string) {
  return prisma.workflow.findMany({
    where: type ? { type } : undefined,
    orderBy: { updatedAt: "desc" },
  });
}

export function createWorkflow(data: Prisma.WorkflowCreateInput) {
  return prisma.workflow.create({ data });
}

export function updateWorkflow(id: string, data: Prisma.WorkflowUpdateInput) {
  return prisma.workflow.update({ where: { id }, data });
}

export function deleteWorkflow(id: string) {
  return prisma.workflow.delete({ where: { id } });
}

export function getFirstWorkflowId() {
  return prisma.workflow.findFirst({
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
}

export function findActiveWebhookWorkflows() {
  return prisma.workflow.findMany({
    where: { status: "active" },
  });
}

export function createWorkflowRun(data: Prisma.WorkflowRunUncheckedCreateInput) {
  return prisma.workflowRun.create({ data });
}

export function getWorkflowRuns(workflowId: string) {
  return prisma.workflowRun.findMany({
    where: { workflowId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
}

export function getWorkflowRun(runId: string) {
  return prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { logs: { orderBy: { startedAt: "asc" as const } } },
  });
}

export function updateWorkflowRun(id: string, data: Prisma.WorkflowRunUncheckedUpdateInput) {
  return prisma.workflowRun.update({ where: { id }, data });
}

export function createWorkflowLog(data: Prisma.WorkflowLogUncheckedCreateInput) {
  return prisma.workflowLog.create({ data });
}
