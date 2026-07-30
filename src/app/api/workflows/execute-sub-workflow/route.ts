import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildParentMap,
  buildForwardMap,
  buildAncestorChain,
  findRoots,
  type NodeOutput,
} from "@/lib/workflow-context";
import { executeNode } from "@/lib/workflows/execute-node";
import { sanitize } from "@/lib/workflows/sanitize";
import type { EditorNode, EditorEdge, NodeDebugLog } from "@/lib/types";

interface ExecuteSubWorkflowRequest {
  workflowId: string;
  input: Record<string, unknown>;
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

    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        source: "subWorkflow",
        triggerPayload: sanitize(input).sanitized,
      },
    });

    // Execute nodes in order
    const context: Record<string, NodeOutput> = {};
    const debugLogs: NodeDebugLog[] = [];
    let lastResult: unknown = undefined;
    let stepNr = 0;

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
      const { debugLog, data } = await executeNode(node, ancestorChain, { runId: run.id, stepNr: ++stepNr });

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

    const allPassed = debugLogs.every((l) => l.success);

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: allPassed ? "success" : "error",
        finishedAt: new Date().toISOString(),
        error: allPassed ? null : "One or more nodes failed",
      },
    });

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
      runId: run.id,
    });
  } catch (error) {
    console.error("Sub-workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
