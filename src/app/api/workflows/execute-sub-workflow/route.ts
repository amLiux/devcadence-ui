import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";
import { findRoots } from "@/lib/workflow-context";
import { sanitize } from "@/lib/workflows/sanitize";
import { runSubWorkflow } from "@/lib/workflows/execute-sub-workflow";
import type { EditorNode, EditorEdge } from "@/lib/types";
import type { NodeOutput } from "@/lib/workflow-context";

const executeSubWorkflowSchema = z.object({
  workflowId: z.string().min(1, "workflowId is required"),
  input: z.record(z.string(), z.unknown()).default({}),
});

function injectInput(nodes: EditorNode[], input: Record<string, unknown>): void {
  const inputNode = nodes.find((node) => node.data.title === "Input");
  if (!inputNode) return;

  const inputMeta = (inputNode.data.metadata || {}) as Record<string, string>;
  Object.values(input).forEach((value, index) => {
    inputMeta[`input_${index + 1}`] =
      typeof value === "string" ? value : JSON.stringify(value);
  });
  inputNode.data.metadata = inputMeta;
}

function returnOutput(
  nodes: EditorNode[],
  context: Record<string, NodeOutput>,
  fallback: unknown,
): unknown {
  const returnNode = nodes.find((node) => node.data.title === "Return");
  const returnContext = returnNode ? context[returnNode.id] : undefined;
  return returnContext?.data ? returnContext.data : fallback;
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, executeSubWorkflowSchema);
    if (!parsed.ok) return parsed.response;
    const { workflowId, input } = parsed.data;

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    if (workflow.type !== "sub-workflow") {
      return NextResponse.json(
        { error: "Workflow is not a reusable sub-workflow" },
        { status: 400 },
      );
    }

    const nodes: EditorNode[] = workflow.nodes ? JSON.parse(workflow.nodes) : [];
    const edges: EditorEdge[] = workflow.edges ? JSON.parse(workflow.edges) : [];
    if (nodes.length === 0) {
      return NextResponse.json({ error: "Workflow has no nodes" }, { status: 400 });
    }
    if (findRoots(nodes, edges).length === 0) {
      return NextResponse.json({ error: "No root nodes found" }, { status: 400 });
    }

    injectInput(nodes, input);

    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        source: "subWorkflow",
        triggerPayload: sanitize(input).sanitized,
      },
    });

    const result = await runSubWorkflow({ nodes, edges, runId: run.id });
    const allPassed = result.debugLogs.every((log) => log.success);

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: allPassed ? "success" : "error",
        finishedAt: new Date().toISOString(),
        error: allPassed ? null : "One or more nodes failed",
      },
    });

    return NextResponse.json({
      success: true,
      output: returnOutput(nodes, result.context, result.lastResult),
      debugLogs: result.debugLogs,
      runId: run.id,
    });
  } catch (error) {
    console.error("Sub-workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 },
    );
  }
}
