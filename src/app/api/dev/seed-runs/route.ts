import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { workflowId } = await req.json();
    if (!workflowId) {
      return NextResponse.json({ error: "workflowId required" }, { status: 400 });
    }

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const runs: Array<{ status: string; source: string; triggerPayload: unknown }> = [
      { status: "success", source: "webhook", triggerPayload: { event: "push", repo: "user/repo" } },
      { status: "error", source: "manual", triggerPayload: { action: "deploy" } },
      { status: "success", source: "test", triggerPayload: null },
      { status: "running", source: "webhook", triggerPayload: { issue: "New bug report" } },
      { status: "success", source: "subWorkflow", triggerPayload: { orderId: "ORD-123" } },
    ];

    const now = Date.now();
    const nodeTitles = ["Webhook", "Transform Data", "HTTP Request", "Conditional", "Retry Loop", "Prompt"];

    for (let i = 0; i < runs.length; i++) {
      const r = runs[i];
      const startedAt = new Date(now - (runs.length - i) * 3600000); // each run 1h apart
      const finishedAt = r.status === "running" ? null : new Date(startedAt.getTime() + Math.floor(Math.random() * 5000));

      const run = await prisma.workflowRun.create({
        data: {
          workflowId,
          status: r.status,
          source: r.source,
          triggerPayload: r.triggerPayload as any,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt?.toISOString() ?? null,
          error: r.status === "error" ? "HTTP request failed: 503 Service Unavailable" : null,
        },
      });

      const stepCount = Math.floor(Math.random() * 4) + 3;
      for (let s = 0; s < stepCount; s++) {
        const stepStartedAt = new Date(startedAt.getTime() + s * 800);
        const stepFinishedAt = new Date(stepStartedAt.getTime() + Math.floor(Math.random() * 400) + 50);
          const stepStatus = r.status === "error" && s === 2 ? "error" : "success";

        const nodeType = nodeTitles[s % nodeTitles.length];
        await prisma.workflowLog.create({
          data: {
            runId: run.id,
            nodeId: `${nodeType}-${s}`,
            nodeType,
            stepNr: s + 1,
            status: stepStatus,
            input: { _name: `Step ${s}`, _success: true } as any,
            output: stepStatus === "error" ? null : { result: `Output of ${nodeType}`, value: Math.random() * 100 } as any,
            error: stepStatus === "error" ? "Connection timed out" : null,
            controlFlow: nodeType === "Conditional" ? { condition: s % 2 === 0 } as any : null,
            meta: nodeType === "Prompt" ? { ai_tokens: Math.floor(Math.random() * 1000), ai_model: "gpt-4o" } as any : null,
            startedAt: stepStartedAt.toISOString(),
            finishedAt: stepFinishedAt.toISOString(),
            elapsedMs: stepFinishedAt.getTime() - stepStartedAt.getTime(),
          },
        });
      }
    }

    return NextResponse.json({ message: `Seeded ${runs.length} runs for workflow ${workflowId}` });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
