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
import type { EditorNode, EditorEdge, NodeDebugLog } from "@/lib/types";

const now = () => new Date().toISOString();

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

    const parents = buildParentMap(edges);
    const forward = buildForwardMap(edges);
    const roots = findRoots(nodes, edges);

    const run = await prisma.workflowRun.create({
      data: { workflowId, source: "test" },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (obj: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };

        const nodeOutputs = new Map<string, NodeOutput>();
        const results: NodeDebugLog[] = [];
        const visited = new Set<string>();
        let stepNr = 0;

        async function walk(nodeId: string) {
          if (visited.has(nodeId)) return;
          visited.add(nodeId);

          const node = nodes.find((n: EditorNode) => n.id === nodeId) as EditorNode | undefined;
          if (!node) return;

          const chain = buildAncestorChain(nodeId, parents, nodeOutputs, nodes);
          enqueue({ type: "step-start", nodeId, title: node.data.title });
          const { debugLog, data } = await executeNode(node, chain, {
            runId: run.id,
            stepNr: ++stepNr,
            onLog: (entry) => enqueue({ type: "log", nodeId, entry }),
          });
          results.push(debugLog);
          enqueue({ type: "step", step: debugLog });

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

        const rootsToWalk: EditorNode[] = [];
        for (const root of roots) {
          const isWebhookTrigger = root.data.type === "Trigger" && root.data.title === "Webhook";
          if (isWebhookTrigger) {
            const meta = (root.data.metadata || {}) as Record<string, string>;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let payload: any;
            if (meta.testPayload) {
              try {
                payload = JSON.parse(meta.testPayload);
              } catch {
                await prisma.workflowRun.update({
                  where: { id: run.id },
                  data: { status: "error", finishedAt: now(), error: "Invalid test payload JSON" },
                });
                stepNr++;
                const step: NodeDebugLog = {
                  nodeId: root.id, title: "Webhook", success: false,
                  logs: [
                    { type: "info", message: "Starting Webhook...", timestamp: now() },
                    { type: "error", message: "Invalid test payload JSON. Please provide valid JSON.", timestamp: now() },
                  ],
                };
                enqueue({ type: "step-start", nodeId: root.id, title: "Webhook" });
                for (const entry of step.logs) enqueue({ type: "log", nodeId: root.id, entry });
                enqueue({ type: "step", step });
                results.push(step);
                await prisma.workflowLog.create({
                  data: {
                    runId: run.id, nodeId: root.id, nodeType: "Webhook", stepNr,
                    status: "error", input: undefined, output: undefined,
                    error: "Invalid test payload JSON", controlFlow: undefined, meta: undefined,
                    startedAt: now(), finishedAt: now(), elapsedMs: 0,
                  },
                });
                visited.add(root.id);
                enqueue({ type: "result", success: false, context: {}, message: "Invalid test payload JSON", runId: run.id });
                controller.close();
                return;
              }
            }

            visited.add(root.id);
            stepNr++;
            const hasTestPayload = !!meta.testPayload;
            const logs = [
              { type: "info" as const, message: "Starting Webhook...", timestamp: now() },
              { type: "success" as const, message: "Webhook completed in 0ms", timestamp: now() },
            ];
            if (hasTestPayload) {
              logs.splice(1, 0,
                { type: "info" as const, message: `Input: ${JSON.stringify(payload)}`, timestamp: now() },
              );
              logs.push({ type: "info" as const, message: `Output: ${JSON.stringify(payload)}`, timestamp: now() });
            }
            const step: NodeDebugLog = {
              nodeId: root.id, title: "Webhook", success: true,
              logs,
            };
            enqueue({ type: "step-start", nodeId: root.id, title: "Webhook" });
            for (const entry of step.logs) enqueue({ type: "log", nodeId: root.id, entry });
            enqueue({ type: "step", step });
            results.push(step);
            await prisma.workflowLog.create({
              data: {
                runId: run.id, nodeId: root.id, nodeType: "Webhook", stepNr,
                status: "success", input: hasTestPayload ? payload : undefined,
                output: hasTestPayload ? payload : undefined,
                error: null, controlFlow: undefined, meta: undefined,
                startedAt: now(), finishedAt: now(), elapsedMs: 0,
              },
            });
            nodeOutputs.set(root.id, { data: payload, success: true, error: null });

            const children = forward.get(root.id) || [];
            for (const child of children) {
              const childNode = nodes.find((n: EditorNode) => n.id === child.targetId);
              if (childNode) rootsToWalk.push(childNode);
            }
          } else {
            rootsToWalk.push(root);
          }
        }

        for (const root of rootsToWalk) {
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

        await prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: allPassed ? "success" : "error",
            finishedAt: new Date().toISOString(),
            nodeOutputs: fullContext,
            error: allPassed ? null : `${results.filter((r) => !r.success).length} node(s) failed`,
          },
        });

        enqueue({
          type: "result",
          context: fullContext,
          success: allPassed,
          message: allPassed
            ? `All ${results.length} node(s) passed`
            : `${results.filter((r) => r.success).length}/${results.length} nodes passed`,
          runId: run.id,
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
