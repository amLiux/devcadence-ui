import { prisma } from "./client";
import type * as Prisma from "@/generated/prisma/internal/prismaNamespace";

export function getConnection(id: string) {
  return prisma.connection.findUnique({ where: { id } });
}

export function getConnections() {
  return prisma.connection.findMany({ orderBy: { updatedAt: "desc" } });
}

export function createConnection(data: Prisma.ConnectionCreateInput) {
  return prisma.connection.create({ data });
}

export function updateConnection(id: string, data: Prisma.ConnectionUpdateInput) {
  return prisma.connection.update({ where: { id }, data });
}

export function deleteConnection(id: string) {
  return prisma.connection.delete({ where: { id } });
}

export function getLatestGitHubConnection() {
  return prisma.connection.findFirst({
    where: { type: "GitHub" },
    orderBy: { updatedAt: "desc" },
  });
}
