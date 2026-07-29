import type { ContextStep } from "@/lib/workflow-context";

export type LogLevel = "info" | "success" | "error" | "warning";

export interface LogEntry {
  type: LogLevel;
  message: string;
  timestamp: string;
}

/** Common result shape returned by all node handlers. */
export interface NodeHandlerResult {
  success: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  /** Per-step logs emitted by the handler during execution. If set, routes use these directly instead of synthesizing start/end logs. */
  logs?: LogEntry[];
}

/** Context passed to every node handler. */
export interface NodeHandlerContext {
  meta: Record<string, string>;
  token: string;
  ancestorChain?: ContextStep;
}
