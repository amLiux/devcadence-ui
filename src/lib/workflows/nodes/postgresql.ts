import { query } from "@/lib/postgresql";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

export async function handlePostgresQuery(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!meta.sql) return { success: false, message: "SQL query is required" };

  const resolvedSql = resolveTemplates(meta.sql, ancestorChain);

  const result = await query(connectionId, resolvedSql);
  return {
    success: true,
    message: `Query returned ${result.rowCount} row(s)`,
    data: {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
    },
  };
}

export async function handlePostgresInsert(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!meta.table) return { success: false, message: "Table name is required" };
  if (!meta.columns || !meta.values) return { success: false, message: "Columns and values are required" };

  const cols = meta.columns.split(",").map((c) => c.trim());
  const rawVals = meta.values.split(",").map((v) => v.trim());
  const vals = rawVals.map((v) => resolveTemplates(v, ancestorChain));

  if (cols.length !== vals.length) {
    return { success: false, message: `Columns (${cols.length}) and values (${vals.length}) count mismatch` };
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO "${resolveTemplates(meta.table, ancestorChain)}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders}) RETURNING *`;

  // Try to parse values as their natural types
  const typedVals: unknown[] = vals.map((v) => {
    if (v === "true") return true;
    if (v === "false") return false;
    if (v === "null") return null;
    const num = Number(v);
    if (!isNaN(num) && v !== "") return num;
    return v;
  });

  const result = await query(connectionId, sql, typedVals);
  return {
    success: true,
    message: `Inserted ${result.rowCount} row(s)`,
    data: result.rows[0],
  };
}

export async function handlePostgresUpdate(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!meta.table) return { success: false, message: "Table name is required" };
  if (!meta.setClause) return { success: false, message: "SET clause is required" };

  let sql = `UPDATE "${resolveTemplates(meta.table, ancestorChain)}" SET ${resolveTemplates(meta.setClause, ancestorChain)}`;

  if (meta.whereClause) {
    sql += ` WHERE ${resolveTemplates(meta.whereClause, ancestorChain)}`;
  }

  sql += " RETURNING *";

  const result = await query(connectionId, sql);
  return {
    success: true,
    message: `Updated ${result.rowCount} row(s)`,
    data: { rows: result.rows, rowCount: result.rowCount },
  };
}

export async function handlePostgresDelete(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!meta.table) return { success: false, message: "Table name is required" };

  let sql = `DELETE FROM "${resolveTemplates(meta.table, ancestorChain)}"`;

  if (meta.whereClause) {
    sql += ` WHERE ${resolveTemplates(meta.whereClause, ancestorChain)}`;
  }

  sql += " RETURNING *";

  const result = await query(connectionId, sql);
  return {
    success: true,
    message: `Deleted ${result.rowCount} row(s)`,
    data: { rows: result.rows, rowCount: result.rowCount },
  };
}
