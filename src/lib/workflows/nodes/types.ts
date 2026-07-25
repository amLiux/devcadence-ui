import type { ContextStep } from "@/lib/workflow-context";

/** Common result shape returned by all node handlers. */
export interface NodeHandlerResult {
  success: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/** Context passed to every node handler. */
export interface NodeHandlerContext {
  meta: Record<string, string>;
  token: string;
  ancestorChain?: ContextStep;
}
