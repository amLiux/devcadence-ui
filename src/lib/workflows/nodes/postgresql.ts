import { query } from "@/lib/postgresql";
import type { NodeHandlerResult } from "./types";

export async function handlePostgresQuery(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain: any,
): Promise<NodeHandlerResult> {
  const { connectionId, sql, expression } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!sql) return { success: false, message: "SQL query is required" };

  // Resolve expression params from ancestor chain
  let resolvedSql = sql;
  if (expression && ancestorChain) {
    resolvedSql = resolveParams(sql, expression, ancestorChain);
  }

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
  const { connectionId, table, columns, values, expression } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!table) return { success: false, message: "Table name is required" };
  if (!columns || !values) return { success: false, message: "Columns and values are required" };

  const cols = columns.split(",").map((c) => c.trim());
  const vals = values.split(",").map((v) => v.trim());

  if (cols.length !== vals.length) {
    return { success: false, message: `Columns (${cols.length}) and values (${vals.length}) count mismatch` };
  }

  // Resolve expression params
  let resolvedVals: unknown[] = vals.map((v) => v);
  if (expression && ancestorChain) {
    resolvedVals = vals.map((v) => resolveParamValue(v, expression, ancestorChain));
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders}) RETURNING *`;

  const result = await query(connectionId, sql, resolvedVals);
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
  const { connectionId, table, setClause, whereClause, expression } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!table) return { success: false, message: "Table name is required" };
  if (!setClause) return { success: false, message: "SET clause is required" };

  let sql = `UPDATE "${table}" SET ${setClause}`;
  const params: unknown[] = [];

  if (whereClause) {
    let resolvedWhere = whereClause;
    if (expression && ancestorChain) {
      resolvedWhere = resolveParams(whereClause, expression, ancestorChain);
    }
    sql += ` WHERE ${resolvedWhere}`;
  }

  sql += " RETURNING *";

  const result = await query(connectionId, sql, params.length > 0 ? params : undefined);
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
  const { connectionId, table, whereClause, expression } = meta;
  if (!connectionId) return { success: false, message: "PostgreSQL connection is required" };
  if (!table) return { success: false, message: "Table name is required" };

  let sql = `DELETE FROM "${table}"`;
  const params: unknown[] = [];

  if (whereClause) {
    let resolvedWhere = whereClause;
    if (expression && ancestorChain) {
      resolvedWhere = resolveParams(whereClause, expression, ancestorChain);
    }
    sql += ` WHERE ${resolvedWhere}`;
  }

  sql += " RETURNING *";

  const result = await query(connectionId, sql, params.length > 0 ? params : undefined);
  return {
    success: true,
    message: `Deleted ${result.rowCount} row(s)`,
    data: { rows: result.rows, rowCount: result.rowCount },
  };
}

function resolveParams(sql: string, expression: string, ancestorChain: unknown): string {
  // Simple param resolution: replace $paramName with values from ancestor chain
  return sql.replace(/\$(\w+)/g, (match, key) => {
    const value = getNestedValue(ancestorChain, key);
    if (value === undefined) return match;
    return typeof value === "string" ? `'${value.replace(/'/g, "''")}'` : String(value);
  });
}

function resolveParamValue(value: string, expression: string, ancestorChain: unknown): unknown {
  if (value.startsWith("$")) {
    const key = value.slice(1);
    return getNestedValue(ancestorChain, key) ?? value;
  }
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): unknown {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}
