import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";
import { runTestWorkflowStream } from "@/lib/workflows/test-workflow-stream";
import { parseWorkflowVariables } from "@/lib/workflows/variables";
import type { EditorNode, EditorEdge } from "@/lib/types";

const testWorkflowSchema = z.object({
  workflowId: z.string().min(1, "workflowId is required"),
  nodes: z.array(z.custom<EditorNode>()).optional(),
  edges: z.array(z.custom<EditorEdge>()).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, testWorkflowSchema);
    if (!parsed.ok) return parsed.response;
    const { workflowId, nodes: clientNodes, edges: clientEdges } = parsed.data;

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const nodes: EditorNode[] =
      clientNodes && clientNodes.length > 0
        ? clientNodes
        : workflow.nodes
          ? JSON.parse(workflow.nodes)
          : [];
    const edges: EditorEdge[] =
      clientNodes && clientNodes.length > 0
        ? clientEdges || []
        : workflow.edges
          ? JSON.parse(workflow.edges)
          : [];

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
          variables: parseWorkflowVariables(workflow.variables),
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
