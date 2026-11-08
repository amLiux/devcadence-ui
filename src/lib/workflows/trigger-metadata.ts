import { resolveTemplateVariables } from "@/lib/workflow-context";

/**
 * Resolves {{workflow.name}} in trigger metadata before the scheduler registers
 * a repeatable job. Triggers have no ancestor chain, so only workflow
 * variables are available.
 */
export function resolveTriggerMetadata(
  meta: Record<string, string>,
  variables: Record<string, string>,
): Record<string, string> {
  const input = { workflow: variables };
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (typeof value !== "string") return [key, value];
      const resolved = resolveTemplateVariables(value, input);
      // Keep the placeholder when a variable is missing so the scheduler or the
      // worker fails with a clear message instead of silently registering an
      // empty value.
      const missingVariable = resolved === "" && value.includes("{{workflow.");
      return [key, missingVariable ? value : resolved];
    }),
  );
}
