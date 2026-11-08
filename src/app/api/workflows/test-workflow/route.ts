import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runTestWorkflowStream } from "@/lib/workflows/test-workflow-stream";
import type { EditorNode, EditorEdge } from "@/lib/types";

interface TestWorkflowRequest {
  workflowId: string;
  nodes?: EditorNode[];
  edges?: EditorEdge[];
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

    const run = await prisma.workflowRun.create({
      data: { workflowId, source: "test" },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (message: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(message) + "\n"));
        };

        await runTestWorkflowStream({
          runId: run.id,
          nodes,
          edges,
          enqueue,
        });

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
