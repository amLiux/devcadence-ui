import { prisma } from "./client";
import type * as Prisma from "@/generated/prisma/internal/prismaNamespace";

export function getPersonas() {
  return prisma.aIPersona.findMany({ orderBy: { updatedAt: "desc" } });
}

export function createPersona(data: Prisma.AIPersonaCreateInput) {
  return prisma.aIPersona.create({ data });
}

export function updatePersona(id: string, data: Prisma.AIPersonaUpdateInput) {
  return prisma.aIPersona.update({ where: { id }, data });
}

export function deletePersona(id: string) {
  return prisma.aIPersona.delete({ where: { id } });
}

export function getPersona(id: string) {
  return prisma.aIPersona.findUnique({ where: { id } });
}

export function getPrompts() {
  return prisma.aIPrompt.findMany({ orderBy: { updatedAt: "desc" } });
}

export function createPrompt(data: Prisma.AIPromptCreateInput) {
  return prisma.aIPrompt.create({ data });
}

export function updatePrompt(id: string, data: Prisma.AIPromptUpdateInput) {
  return prisma.aIPrompt.update({ where: { id }, data });
}

export function deletePrompt(id: string) {
  return prisma.aIPrompt.delete({ where: { id } });
}

export function getContexts() {
  return prisma.aIContext.findMany({ orderBy: { updatedAt: "desc" } });
}

export function getContextsByIds(ids: string[]) {
  return prisma.aIContext.findMany({ where: { id: { in: ids } } });
}

export function createContext(data: Prisma.AIContextCreateInput) {
  return prisma.aIContext.create({ data });
}

export function updateContext(id: string, data: Prisma.AIContextUpdateInput) {
  return prisma.aIContext.update({ where: { id }, data });
}

export function deleteContext(id: string) {
  return prisma.aIContext.delete({ where: { id } });
}

export function getMemory() {
  return prisma.aIMemory.findMany({ orderBy: { updatedAt: "desc" } });
}

export function getMemoryByIds(ids: string[]) {
  return prisma.aIMemory.findMany({ where: { id: { in: ids } } });
}

export function createMemory(data: Prisma.AIMemoryCreateInput) {
  return prisma.aIMemory.create({ data });
}

export function updateMemory(id: string, data: Prisma.AIMemoryUpdateInput) {
  return prisma.aIMemory.update({ where: { id }, data });
}

export function deleteMemory(id: string) {
  return prisma.aIMemory.delete({ where: { id } });
}
