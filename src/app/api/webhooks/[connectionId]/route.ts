import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac } from "crypto";
import {
  buildParentMap,
  buildForwardMap,
  buildAncestorChain,
  findRoots,
  type NodeOutput,
} from "@/lib/workflow-context";
import { executeNode } from "@/lib/workflows/execute-node";
import { sanitize } from "@/lib/workflows/sanitize";
import { validateSchema } from "@/lib/json-schema";
import type { EditorNode, EditorEdge, NodeDebugLog, WorkflowTriggerType } from "@/lib/types";

const now = () => new Date().toISOString();

function verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const trusted = `sha256=${expected}`;
  return trusted === signature;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  try {
    const { connectionId } = await params;

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.type !== "Webhook") {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const config = connection.config as Record<string, string>;
    const secret = config.secret;

    if (secret) {
      const signature = req.headers.get("x-hub-signature-256") || req.headers.get("x-webhook-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
      }

      const rawBody = await req.text();
      if (!verifyHmacSignature(rawBody, secret, signature)) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }

      const body = JSON.parse(rawBody);
      return await executeWebhook(connectionId, body, req);
    }

    const body = await req.json();
    return await executeWebhook(connectionId, body, req);
  } catch (error) {
    console.error(
      "POST /api/webhooks/[connectionId] error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook execution failed" },
      { status: 500 },
    );
  }
}

async function executeWebhook(
  connectionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  req: Request,
) {
  const workflows = await prisma.workflow.findMany({
    where: { status: "active" },
  });

  const matchingWorkflows = workflows.filter((workflow) => {
    if (!workflow.nodes) return false;
    const nodes: EditorNode[] = JSON.parse(workflow.nodes);
    return nodes.some(
      (node) =>
        node.data.type === "Trigger" &&
        node.data.title === "Webhook" &&
        (node.data.metadata as Record<string, string>)?.connectionId === connectionId,
    );
  });

  if (matchingWorkflows.length === 0) {
    return NextResponse.json({
      success: true,
      message: "Webhook received but no active workflows match this webhook",
    });
  }

  const validationErrors: { workflowId: string; workflowName: string; errors: string[] }[] = [];
  const validWorkflows = [];

  for (const workflow of matchingWorkflows) {
    const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
    const webhookNode = nodes.find(
      (node) =>
        node.data.type === "Trigger" &&
        node.data.title === "Webhook" &&
        (node.data.metadata as Record<string, string>)?.connectionId === connectionId,
    );
    const schemaJson = (webhookNode?.data.metadata as Record<string, string>)?.schemaJson;
    if (schemaJson) {
      try {
        const schema = JSON.parse(schemaJson);
        const result = validateSchema(schema, body);
        if (!result.valid) {
          validationErrors.push({ workflowId: workflow.id, workflowName: workflow.name, errors: result.errors });
          continue;
        }
      } catch {
        validationErrors.push({ workflowId: workflow.id, workflowName: workflow.name, errors: ["Invalid JSON schema configured on webhook trigger"] });
        continue;
      }
    }
    validWorkflows.push(workflow);
  }

  if (validWorkflows.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Webhook payload failed validation against all matching workflows",
        errors: validationErrors,
      },
      { status: 422 },
    );
  }

  const results = [];

  for (const workflow of validWorkflows) {
    const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
    const edges: EditorEdge[] = workflow.edges ? JSON.parse(workflow.edges) : [];

    const run = await prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        source: "webhook",
        triggerPayload: sanitize(body).sanitized,
      },
    });

    const parents = buildParentMap(edges);
    const forward = buildForwardMap(edges);
    const roots = findRoots(nodes, edges);

    const nodeOutputs = new Map<string, NodeOutput>();
    const stepResults: NodeDebugLog[] = [];
    const visited = new Set<string>();
    let stepNr = 0;

    // Store webhook payload BEFORE walking so downstream nodes can access it via previousStep
    const webhookNode = nodes.find(
      (n) =>
        n.data.type === "Trigger" &&
        n.data.title === "Webhook" &&
        (n.data.metadata as Record<string, string>)?.connectionId === connectionId,
    );
    if (webhookNode) {
      nodeOutputs.set(webhookNode.id, {
        data: body,
        success: true,
        error: null,
      });
    }

    // Queue-based traversal: ensure all parents execute before any child
    const queue: string[] = [];

    for (const root of roots) {
      const isWebhookTrigger = root.data.type === "Trigger" && root.data.title === "Webhook";
      if (isWebhookTrigger) {
        const startedAt = now();
        stepNr++;
        const payload = sanitize(body).sanitized;
        stepResults.push({
          nodeId: root.id,
          title: "Webhook",
          success: true,
          logs: [
            { type: "info", message: "Starting Webhook...", timestamp: startedAt },
            { type: "info", message: `Input: ${JSON.stringify(payload)}`, timestamp: startedAt },
            { type: "success", message: "Webhook completed in 0ms", timestamp: now() },
            { type: "info", message: `Output: ${JSON.stringify(payload)}`, timestamp: now() },
          ],
        });
        await prisma.workflowLog.create({
          data: {
            runId: run.id,
            nodeId: root.id,
            nodeType: "Webhook",
            stepNr,
            status: "success",
            input: undefined,
            output: payload,
            error: null,
            controlFlow: undefined,
            meta: undefined,
            startedAt,
            finishedAt: now(),
            elapsedMs: 0,
          },
        });
        visited.add(root.id);
        const webhookChildren = forward.get(root.id) || [];
        for (const child of webhookChildren) {
          queue.push(child.targetId);
        }
      } else {
        queue.push(root.id);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;

      // Defer if not all parents are done
      const nodeParents = parents.get(nodeId) || [];
      if (nodeParents.some((p) => !visited.has(p))) {
        queue.push(nodeId);
        continue;
      }

      visited.add(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const chain = buildAncestorChain(nodeId, parents, nodeOutputs, nodes);
      const { debugLog, data } = await executeNode(node, chain, { runId: run.id, stepNr: ++stepNr });
      stepResults.push(debugLog);

      if (!nodeOutputs.has(nodeId)) {
        nodeOutputs.set(nodeId, {
          data: data ?? null,
          success: debugLog.success,
          error: debugLog.success
            ? null
            : debugLog.logs.find((l) => l.type === "error")?.message ?? "Unknown error",
        });
      }

      const children = forward.get(nodeId) || [];

      if (
        node.data.title === "Conditional" &&
        data &&
        typeof data === "object" &&
        "condition" in data
      ) {
        const condition = (data as { condition: boolean }).condition;
        const targetHandle = condition ? "success" : "failure";
        const matching = children.find((c) => c.sourceHandle === targetHandle);
        if (matching) {
          queue.push(matching.targetId);
        }
      } else {
        for (const child of children) {
          queue.push(child.targetId);
        }
      }
    }

    const allPassed = stepResults.every((r) => r.success);

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: allPassed ? "success" : "error",
        finishedAt: new Date().toISOString(),
        error: allPassed ? null : "One or more nodes failed",
      },
    });

    results.push({
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: allPassed,
      steps: stepResults,
      runId: run.id,
    });
  }

  const response: Record<string, unknown> = {
    success: true,
    message: `Webhook triggered ${results.length} workflow(s)`,
    results,
  };
  if (validationErrors.length > 0) {
    response.validationErrors = validationErrors;
  }
  return NextResponse.json(response);
}
