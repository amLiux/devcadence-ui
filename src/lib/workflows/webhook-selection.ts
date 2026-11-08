import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateSchema } from "@/lib/json-schema";
import type { EditorNode } from "@/lib/types";

export interface WebhookWorkflow {
  id: string;
  name: string;
  nodes: string | null;
  edges: string | null;
}

export interface WebhookValidationError {
  workflowId: string;
  workflowName: string;
  errors: string[];
}

export interface WebhookRateLimit {
  workflowId: string;
  workflowName: string;
  retryAfter: number;
}

export function findWebhookNode(nodes: EditorNode[], connectionId: string) {
  return nodes.find(
    (node) =>
      node.data.type === "Trigger" &&
      node.data.title === "Webhook" &&
      (node.data.metadata as Record<string, string>)?.connectionId === connectionId,
  );
}

export async function findMatchingWorkflows(connectionId: string): Promise<WebhookWorkflow[]> {
  const workflows = await prisma.workflow.findMany({
    where: { status: "active" },
  });

  return workflows.filter((workflow) => {
    if (!workflow.nodes) return false;
    const nodes: EditorNode[] = JSON.parse(workflow.nodes);
    return Boolean(findWebhookNode(nodes, connectionId));
  });
}

export async function filterValidWorkflows(
  matchingWorkflows: WebhookWorkflow[],
  connectionId: string,
  body: unknown,
): Promise<{
  validWorkflows: WebhookWorkflow[];
  validationErrors: WebhookValidationError[];
  rateLimited: WebhookRateLimit[];
}> {
  const validationErrors: WebhookValidationError[] = [];
  const rateLimited: WebhookRateLimit[] = [];
  const validWorkflows: WebhookWorkflow[] = [];

  for (const workflow of matchingWorkflows) {
    const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
    const webhookNode = findWebhookNode(nodes, connectionId);
    const metadata = (webhookNode?.data.metadata || {}) as Record<string, string>;

    const rateLimitResult = await checkRateLimit(`webhook:${webhookNode?.id || workflow.id}`, {
      requests: metadata.rateLimitRequests
        ? parseInt(metadata.rateLimitRequests, 10)
        : undefined,
      windowSeconds: metadata.rateLimitWindowSeconds
        ? parseInt(metadata.rateLimitWindowSeconds, 10)
        : undefined,
    });
    if (!rateLimitResult.allowed) {
      rateLimited.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        retryAfter: rateLimitResult.retryAfter || 1,
      });
      continue;
    }

    const schemaJson = metadata.schemaJson;
    if (schemaJson) {
      try {
        const schema = JSON.parse(schemaJson);
        const result = validateSchema(schema, body);
        if (!result.valid) {
          validationErrors.push({
            workflowId: workflow.id,
            workflowName: workflow.name,
            errors: result.errors,
          });
          continue;
        }
      } catch {
        validationErrors.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          errors: ["Invalid JSON schema configured on webhook trigger"],
        });
        continue;
      }
    }

    validWorkflows.push(workflow);
  }

  return { validWorkflows, validationErrors, rateLimited };
}
