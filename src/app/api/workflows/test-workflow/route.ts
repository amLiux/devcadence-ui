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
  handleCallWorkflow,
  handleInput,
  handleReturn,
  handleBuildJson,
  handleRetryLoop,
  type NodeHandlerResult,
} from "@/lib/workflows/nodes";
import type { EditorNode, EditorEdge, NodeDebugLog, LogEntry } from "@/lib/types";

interface TestWorkflowRequest {
  workflowId: string;
  nodes?: EditorNode[];
  edges?: EditorEdge[];
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
    } else if (title === "Call Workflow") {
      result = await handleCallWorkflow(meta, ancestorChain);
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
    const {
      workflowId,
      nodes: clientNodes,
      edges: clientEdges,
    } = (await req.json()) as TestWorkflowRequest;

    let nodes: EditorNode[];
    let edges: EditorEdge[];

    if (clientNodes && clientNodes.length > 0) {
      nodes = clientNodes;
      edges = clientEdges || [];
    } else {
      const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!workflow) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }
      nodes = workflow.nodes ? JSON.parse(workflow.nodes) : [];
      edges = workflow.edges ? JSON.parse(workflow.edges) : [];
    }

    if (nodes.length === 0) {
      return NextResponse.json({ error: "Workflow has no nodes" }, { status: 400 });
    }

    const parents = buildParentMap(edges);
    const forward = buildForwardMap(edges);
    const roots = findRoots(nodes, edges);

    const nodeOutputs = new Map<string, NodeOutput>();
    const results: NodeDebugLog[] = [];
    const visited = new Set<string>();

    async function walk(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find((n: EditorNode) => n.id === nodeId) as EditorNode | undefined;
      if (!node) return;

      const chain = buildAncestorChain(nodeId, parents, nodeOutputs, nodes);
      const { debugLog, data } = await executeNode(node, chain);
      results.push(debugLog);

      nodeOutputs.set(nodeId, {
        data: data ?? null,
        success: debugLog.success,
        error: debugLog.success ? null : debugLog.logs.find((l) => l.type === "error")?.message ?? "Unknown error",
      });

      const children = forward.get(nodeId) || [];

      if (node.data.title === "Conditional" && data && typeof data === "object" && "condition" in data) {
        const condition = (data as { condition: boolean }).condition;
        const targetHandle = condition ? "success" : "failure";
        const matching = children.find((c) => c.sourceHandle === targetHandle);
        if (matching) {
          await walk(matching.targetId);
        }
      } else {
        for (const child of children) {
          await walk(child.targetId);
        }
      }
    }

    for (const root of roots) {
      await walk(root.id);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullContext: Record<string, any> = {};
    for (const [nodeId, output] of nodeOutputs) {
      const node = nodes.find((n: EditorNode) => n.id === nodeId) as EditorNode | undefined;
      fullContext[nodeId] = {
        name: node?.data.title ?? "Unknown",
        ...output,
      };
    }

    const allPassed = results.every((r) => r.success);

    return NextResponse.json({
      success: allPassed,
      steps: results,
      context: fullContext,
      message: allPassed
        ? `All ${results.length} node(s) passed`
        : `${results.filter((r) => r.success).length}/${results.length} nodes passed`,
    });
  } catch (error) {
    console.error(
      "POST /api/workflows/test-workflow error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workflow test failed" },
      { status: 500 },
    );
  }
}
