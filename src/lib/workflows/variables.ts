export type WorkflowVariables = Record<string, string>;

/** Accepts the stored JSON value and keeps only string entries. */
export function parseWorkflowVariables(value: unknown): WorkflowVariables {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const variables: WorkflowVariables = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string") variables[key] = raw;
  }
  return variables;
}
