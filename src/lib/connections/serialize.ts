import type { Connection } from "@/lib/types";
import { redactConfig } from "./redact";

export interface ConnectionRow {
  id: string;
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** The only shape a connection should take on its way to the client. */
export function toClientConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    type: row.type as Connection["type"],
    name: row.name,
    description: row.description,
    config: redactConfig(row.config),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
