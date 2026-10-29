import { prisma } from "@/lib/db";
import { decryptConfig, encryptConfig } from "@/lib/secrets";

export function packConfig(config: Record<string, unknown>): string {
  return encryptConfig(config);
}

export function unpackConfig(stored: unknown): Record<string, unknown> {
  return decryptConfig(stored);
}

export async function getConnectionConfigById(id: string): Promise<Record<string, unknown> | null> {
  const conn = await prisma.connection.findUnique({ where: { id } });
  if (!conn) return null;
  return unpackConfig(conn.config);
}

export async function getConnectionConfigByType(type: string): Promise<Record<string, unknown> | null> {
  const conn = await prisma.connection.findFirst({
    where: { type },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn) return null;
  return unpackConfig(conn.config);
}

export async function getConnectionByType(type: string) {
  return prisma.connection.findFirst({
    where: { type },
    orderBy: { updatedAt: "desc" },
  });
}

export { encryptConfig, decryptConfig };
