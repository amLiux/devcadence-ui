import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildParentMap,
  buildAncestorChain,
  outputsFromContext,
  type ContextStep,
} from "@/lib/workflow-context";
import {
  handleRetryLoop,
} from "@/lib/workflows/nodes";
import { executeNode } from "@/lib/workflows/execute-node";
import { sanitize } from "@/lib/workflows/sanitize";
import type { EditorNode, EditorEdge, NodeDebugLog, WorkflowContext } from "@/lib/types";

interface TestNodeRequest {
  node: EditorNode;
  workflowId?: string;
  edges?: EditorEdge[];
  nodes?: EditorNode[];
  context?: WorkflowContext;
}

export async function POST(req: Request) {
  try {
    const { node, workflowId: reqWorkflowId, edges, nodes: clientNodes, context } =
      (await req.json()) as TestNodeRequest;

    const meta = (node.data.metadata || {}) as Record<string, string>;
    const { title, type } = node.data;

    // Look up an actual workflow — prefer client-provided ID, or query first available
    let workflowId: string;
    if (reqWorkflowId) {
      workflowId = reqWorkflowId;
    } else {
      const first = await prisma.workflow.findFirst({ select: { id: true }, orderBy: { createdAt: "desc" } });
      if (!first) {
        return NextResponse.json({ error: "No workflow found" }, { status: 400 });
      }
      workflowId = first.id;
    }

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

    const run = await prisma.workflowRun.create({
      data: { workflowId, source: "test" },
    });

    // Streaming path for retry loop — NDJSON, one JSON object per line
    if (title === "Retry Loop") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const startedAt = new Date().toISOString();
          const result = await handleRetryLoop(meta, ancestorChain, async (entry) => {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "log", entry }) + "\n"));
            await prisma.workflowLog.create({
              data: {
                runId: run.id,
                nodeId: node.id,
                nodeType: title,
                stepNr: 1,
                status: "retry",
                startedAt,
                finishedAt: entry.timestamp,
                elapsedMs: 0,
                error: entry.type === "error" ? entry.message : null,
              },
            });
          });
          const finishedAt = new Date().toISOString();
          const sanitizedOutput = sanitize(result.data);
          await prisma.workflowLog.create({
            data: {
              runId: run.id,
              nodeId: node.id,
              nodeType: title,
              stepNr: 1,
              status: result.success ? "success" : "error",
              output: sanitizedOutput.sanitized as any,
              error: result.success ? null : result.message,
              meta: extractRetryMeta(result.data) as any,
              startedAt,
              finishedAt,
              elapsedMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
            },
          });
          await prisma.workflowRun.update({
            where: { id: run.id },
            data: {
              status: result.success ? "success" : "error",
              finishedAt,
              error: result.success ? null : result.message,
            },
          });
          controller.enqueue(encoder.encode(JSON.stringify({ type: "result", nodeId: node.id, title, ...result }) + "\n"));
          controller.close();
        },
      });
      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const { debugLog, data } = await executeNode(node, ancestorChain, { runId: run.id, stepNr: 1 });

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: debugLog.success ? "success" : "error",
        finishedAt: new Date().toISOString(),
        error: debugLog.success ? null : "Node execution failed",
      },
    });

    return NextResponse.json({
      ...debugLog,
      data: data ?? null,
      runId: run.id,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRetryMeta(data: any): Record<string, unknown> | null {
  if (!data) return null;
  const m: Record<string, unknown> = {};
  if (data.attempts) m.retry_attempts = data.attempts;
  if (data.maxAttempts) m.retry_max = data.maxAttempts;
  if (data.totalDuration) m.http_latency = data.totalDuration;
  return Object.keys(m).length > 0 ? m : null;
}
