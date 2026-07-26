import { Pool } from "pg";
import type { QueryResult } from "pg";
import { prisma } from "@/lib/db";

const pools = new Map<string, Pool>();

function getPoolConfig(connectionId: string, config: Record<string, string>) {
  return {
    host: config.host,
    port: parseInt(config.port || "5432", 10),
    database: config.database,
    user: config.user,
    password: config.password,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Key for pooling by connection ID
    application_name: `devdock-${connectionId}`,
  };
}

export async function getConnectionPool(connectionId: string): Promise<Pool> {
  if (pools.has(connectionId)) {
    return pools.get(connectionId)!;
  }

  const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new Error(`Connection ${connectionId} not found`);
  if (conn.type !== "PostgreSQL") throw new Error(`Connection ${connectionId} is not PostgreSQL`);

  const config = conn.config as Record<string, string>;
  const pool = new Pool(getPoolConfig(connectionId, config));

  // Test connection
  const client = await pool.connect();
  client.release();

  pools.set(connectionId, pool);
  return pool;
}

export async function query(
  connectionId: string,
  text: string,
  params?: unknown[],
): Promise<QueryResult> {
  const pool = await getConnectionPool(connectionId);
  return pool.query(text, params);
}

export async function testConnection(connectionId: string): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    const pool = await getConnectionPool(connectionId);
    const result = await pool.query("SELECT version()");
    return {
      success: true,
      message: "Connected successfully",
      version: result.rows[0]?.version,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function listTables(connectionId: string): Promise<string[]> {
  const result = await query(
    connectionId,
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  return result.rows.map((r) => r.table_name);
}

export async function describeTable(connectionId: string, tableName: string) {
  const result = await query(
    connectionId,
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName],
  );
  return result.rows;
}
