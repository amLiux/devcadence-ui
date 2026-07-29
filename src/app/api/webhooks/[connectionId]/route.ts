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
import {
  handleTransformData,
  handleConditional,
  handleHttpRequest,
  handleGithubAction,
  handlePostgresQuery,
  handlePostgresInsert,
  handlePostgresUpdate,
  handlePostgresDelete,
  handlePrompt,
  handleClassify,
  handleExtract,
  handleCallWorkflow,
  handleInput,
  handleReturn,
  handleBuildJson,
  handleRetryLoop,
  type NodeHandlerResult,
} from "@/lib/workflows/nodes";
import type { EditorNode, EditorEdge, NodeDebugLog, LogEntry, WorkflowTriggerType } from "@/lib/types";

function verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const trusted = `sha256=${expected}`;
  return trusted === signature;
}

async function executeNode(
  node: EditorNode,
  ancestorChain: import("@/lib/workflow-context").ContextStep | undefined,
): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const meta = (node.data.metadata || {}) as Record<string, string>;
  const { title, type } = node.data;
  const now = () => new Date().toISOString();
  const logs: LogEntry[] = [];

  try {
    let result: NodeHandlerResult;

    if (title === "Conditional") {
      result = await handleConditional(meta, ancestorChain);
    } else if (title === "Transform Data") {
      result = await handleTransformData(meta, ancestorChain);
    } else if (title === "Build JSON") {
      result = await handleBuildJson(meta, ancestorChain);
    } else if (title === "Retry Loop") {
      result = await handleRetryLoop(meta, ancestorChain);
    } else if (title === "HTTP Request") {
      result = await handleHttpRequest(meta, ancestorChain);
    } else if (type === "Trigger" && title === "Webhook") {
      result = { success: true, message: "Webhook payload received" };
    } else if (title === "PostgreSQL Query") {
      result = await handlePostgresQuery(meta, ancestorChain);
    } else if (title === "PostgreSQL Insert") {
      result = await handlePostgresInsert(meta, ancestorChain);
    } else if (title === "PostgreSQL Update") {
      result = await handlePostgresUpdate(meta, ancestorChain);
    } else if (title === "PostgreSQL Delete") {
      result = await handlePostgresDelete(meta, ancestorChain);
    } else if (title === "Prompt") {
      result = await handlePrompt(meta, ancestorChain);
    } else if (title === "Classify") {
      result = await handleClassify(meta, ancestorChain);
    } else if (title === "Extract") {
      result = await handleExtract(meta, ancestorChain);
    } else if (title === "Call Workflow") {
      result = await handleCallWorkflow(meta, ancestorChain);
    } else if (title === "Input") {
      result = await handleInput(meta, ancestorChain);
    } else if (title === "Return") {
      result = await handleReturn(meta, ancestorChain);
    } else {
      result = await handleGithubAction(title, meta, ancestorChain);
    }

    if (result.logs) {
      return {
        debugLog: { nodeId: node.id, title, success: result.success, logs: result.logs },
        data: result.data,
      };
    }

    logs.push({ type: "info", message: `Starting ${title}...`, timestamp: now() });

    logs.push({
      type: result.success ? "success" : "error",
      message: result.message,
      timestamp: now(),
    });

    if (result.data) {
      logs.push({
        type: "info",
        message: `Output: ${JSON.stringify(result.data, null, 2)}`,
        timestamp: now(),
      });
    }

    return {
      debugLog: { nodeId: node.id, title, success: result.success, logs },
      data: result.data,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Execution failed";
    logs.push({ type: "error", message: msg, timestamp: now() });
    return {
      debugLog: { nodeId: node.id, title, success: false, logs },
      data: undefined,
    };
  }
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
    where: { OR: [{ status: "active" }, { publish: true }] },
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

  const results = [];

  for (const workflow of matchingWorkflows) {
    const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
    const edges: EditorEdge[] = workflow.edges ? JSON.parse(workflow.edges) : [];

    const parents = buildParentMap(edges);
    const forward = buildForwardMap(edges);
    const roots = findRoots(nodes, edges);

    const nodeOutputs = new Map<string, NodeOutput>();
    const stepResults: NodeDebugLog[] = [];
    const visited = new Set<string>();

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
    const queue = roots.map((r) => r.id);

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
      const { debugLog, data } = await executeNode(node, chain);
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

    results.push({
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: allPassed,
      steps: stepResults,
    });
  }

  return NextResponse.json({
    success: true,
    message: `Webhook triggered ${results.length} workflow(s)`,
    results,
  });
}
