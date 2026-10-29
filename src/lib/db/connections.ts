import { prisma } from "./client";
import { packConfig, unpackConfig } from "@/lib/connection-config";

export interface ConnectionWithDecryptedConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

function decrypt(conn: { id: string; type: string; name: string; description: string; config: unknown; createdAt: Date; updatedAt: Date }): ConnectionWithDecryptedConfig {
  return {
    ...conn,
    config: unpackConfig(conn.config),
  };
}

export async function getConnection(id: string): Promise<ConnectionWithDecryptedConfig | null> {
  const conn = await prisma.connection.findUnique({ where: { id } });
  if (!conn) return null;
  return decrypt(conn);
}

export async function getConnections(): Promise<ConnectionWithDecryptedConfig[]> {
  const conns = await prisma.connection.findMany({ orderBy: { updatedAt: "desc" } });
  return conns.map(decrypt);
}

interface ConnectionInput {
  type: string;
  name: string;
  description?: string;
  config: Record<string, unknown>;
}

export async function createConnection(data: ConnectionInput): Promise<ConnectionWithDecryptedConfig> {
  const conn = await prisma.connection.create({
    data: {
      type: data.type,
      name: data.name,
      description: data.description || "",
      config: packConfig(data.config),
    },
  });
  return decrypt(conn);
}

interface ConnectionUpdateInput {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

export async function updateConnection(
  id: string,
  data: ConnectionUpdateInput,
): Promise<ConnectionWithDecryptedConfig> {
  const conn = await prisma.connection.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.config !== undefined && { config: packConfig(data.config) }),
    },
  });
  return decrypt(conn);
}

export async function deleteConnection(id: string): Promise<void> {
  await prisma.connection.delete({ where: { id } });
}

export async function getLatestGitHubConnection(): Promise<ConnectionWithDecryptedConfig | null> {
  const conn = await prisma.connection.findFirst({
    where: { type: "GitHub" },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn) return null;
  return decrypt(conn);
}
