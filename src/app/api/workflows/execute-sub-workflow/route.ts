import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
  handleGithubTrigger,
  handleGithubAction,
  handlePostgresQuery,
  handlePostgresInsert,
  handlePostgresUpdate,
  handlePostgresDelete,
  handleWebhookTrigger,
  handlePrompt,
  handleClassify,
  handleExtract,
  handleInput,
  handleReturn,
  handleBuildJson,
  handleRetryLoop,
  type NodeHandlerResult,
} from "@/lib/workflows/nodes";
import type { EditorNode, EditorEdge, NodeDebugLog, LogEntry } from "@/lib/types";

interface ExecuteSubWorkflowRequest {
  workflowId: string;
  input: Record<string, unknown>;
}

async function executeNode(
  node: EditorNode,
  ancestorChain: import("@/lib/workflow-context").ContextStep | undefined,
): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const meta = (node.data.metadata || {}) as Record<string, string>;
  const { title, type } = node.data;
  const now = () => new Date().toISOString();
  const logs: LogEntry[] = [];

  logs.push({ type: "info", message: `Starting ${title}...`, timestamp: now() });

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
      result = handleWebhookTrigger(meta);
    } else if (type === "GitHub" && title.startsWith("Listen")) {
      result = await handleGithubTrigger(title, meta);
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
    } else if (title === "Input") {
      result = await handleInput(meta, ancestorChain);
    } else if (title === "Return") {
      result = await handleReturn(meta, ancestorChain);
    } else {
      result = await handleGithubAction(title, meta, ancestorChain);
    }

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

export async function POST(req: Request) {
  try {
    const { workflowId, input } = (await req.json()) as ExecuteSubWorkflowRequest;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (workflow.type !== "sub-workflow") {
      return NextResponse.json({ error: "Workflow is not a reusable sub-workflow" }, { status: 400 });
    }

    const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
    const edges: EditorEdge[] = workflow.edges ? JSON.parse(workflow.edges) : [];

    if (nodes.length === 0) {
      return NextResponse.json({ error: "Workflow has no nodes" }, { status: 400 });
    }

    // Inject input data into the Input node's metadata
    const inputNode = nodes.find((n) => n.data.title === "Input");
    if (inputNode) {
      const inputMeta = (inputNode.data.metadata || {}) as Record<string, string>;
      const inputValues = Object.values(input);
      
      // Match input values by position to input_1, input_2, input_3
      for (let i = 0; i < inputValues.length; i++) {
        const key = `input_${i + 1}`;
        const value = inputValues[i];
        inputMeta[key] = typeof value === "string" ? value : JSON.stringify(value);
      }
      
      inputNode.data.metadata = inputMeta;
    }

    // Build execution order
    const parentMap = buildParentMap(edges);
    const forwardMap = buildForwardMap(edges);
    const rootNodes = findRoots(nodes, edges);
    const executionOrder = rootNodes.map((n) => n.id);

    if (executionOrder.length === 0) {
      return NextResponse.json({ error: "No root nodes found" }, { status: 400 });
    }

    // Execute nodes in order
    const context: Record<string, NodeOutput> = {};
    const debugLogs: NodeDebugLog[] = [];
    let lastResult: unknown = undefined;

    const visited = new Set<string>();
    const queue = [...executionOrder];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // Check if all parents are processed
      const parents = parentMap.get(nodeId) || [];
      if (parents.some((p) => !visited.has(p))) {
        // Re-queue this node
        queue.push(nodeId);
        continue;
      }

      const ancestorChain = buildAncestorChain(nodeId, parentMap, new Map(Object.entries(context)), nodes);
      const { debugLog, data } = await executeNode(node, ancestorChain);

      debugLogs.push(debugLog);
      context[nodeId] = { data, success: true, error: null };
      lastResult = data;

      // Add children to queue
      const children = forwardMap.get(nodeId) || [];
      for (const child of children) {
        if (!visited.has(child.targetId)) {
          queue.push(child.targetId);
        }
      }
    }

    // Find Return node output
    const returnNode = nodes.find((n) => n.data.title === "Return");
    let output = lastResult;
    if (returnNode) {
      const returnContext = context[returnNode.id];
      if (returnContext?.data) {
        output = returnContext.data;
      }
    }

    return NextResponse.json({
      success: true,
      output,
      debugLogs,
    });
  } catch (error) {
    console.error("Sub-workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
