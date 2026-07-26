import { NextResponse } from "next/server";
import {
  buildParentMap,
  buildAncestorChain,
  outputsFromContext,
  type ContextStep,
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
  type NodeHandlerResult,
} from "@/lib/workflows/nodes";
import type { EditorNode, EditorEdge, NodeDebugLog, LogEntry, WorkflowContext } from "@/lib/types";

interface TestNodeRequest {
  node: EditorNode;
  edges?: EditorEdge[];
  nodes?: EditorNode[];
  context?: WorkflowContext;
}

export async function POST(req: Request) {
  try {
    const { node, edges, nodes: clientNodes, context } = (await req.json()) as TestNodeRequest;

    const meta = (node.data.metadata || {}) as Record<string, string>;
    const { title, type } = node.data;

    // Build ancestor chain from editor context (parents must already be tested)
    let ancestorChain: ContextStep | undefined;
    if (edges && context && edges.length > 0) {
      const parents = buildParentMap(edges);
      const contextOutputs = outputsFromContext(context);
      const allNodes = clientNodes ?? [
        ...Object.entries(context).map(([id, entry]) => ({
          id,
          data: { title: entry.name },
        })),
      ] as EditorNode[];
      ancestorChain = buildAncestorChain(node.id, parents, contextOutputs, allNodes);
    }

    const now = () => new Date().toISOString();
    const logs: LogEntry[] = [];

    logs.push({ type: "info", message: `Starting ${title}...`, timestamp: now() });

    let result: NodeHandlerResult;
    try {
      if (title === "Conditional") {
        result = await handleConditional(meta, ancestorChain);
      } else if (title === "Transform Data") {
        result = await handleTransformData(meta, ancestorChain);
      } else if (title === "HTTP Request") {
        result = await handleHttpRequest(meta);
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
      } else {
        result = await handleGithubAction(title, meta);
      }
    } catch (err) {
      result = {
        success: false,
        message: err instanceof Error ? err.message : "Execution failed",
      };
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

    const debugLog: NodeDebugLog = {
      nodeId: node.id,
      title,
      success: result.success,
      logs,
    };

    return NextResponse.json({
      ...debugLog,
      data: result.data ?? null,
    });
  } catch (error) {
    console.error(
      "POST /api/workflows/test-node error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        nodeId: "unknown",
        title: "Unknown",
        success: false,
        logs: [
          {
            type: "error",
            message: error instanceof Error ? error.message : "Test failed",
            timestamp: new Date().toISOString(),
          },
        ],
      } satisfies NodeDebugLog,
      { status: 500 },
    );
  }
}
