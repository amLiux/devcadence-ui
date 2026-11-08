import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { readJsonBody } from "@/lib/api/body";

interface SeedRun {
  status: string;
  source: string;
  triggerPayload: unknown;
}

const NODE_TITLES = [
  "Webhook",
  "Transform Data",
  "HTTP Request",
  "Conditional",
  "Retry Loop",
  "Prompt",
];

async function seedSteps(
  runId: string,
  status: string,
  startedAt: Date,
): Promise<void> {
  const stepCount = Math.floor(Math.random() * 4) + 3;

  for (let step = 0; step < stepCount; step++) {
    const stepStartedAt = new Date(startedAt.getTime() + step * 800);
    const stepFinishedAt = new Date(
      stepStartedAt.getTime() + Math.floor(Math.random() * 400) + 50,
    );
    const stepStatus = status === "error" && step === 2 ? "error" : "success";
    const nodeType = NODE_TITLES[step % NODE_TITLES.length];

    await prisma.workflowLog.create({
      data: {
        runId,
        nodeId: `${nodeType}-${step}`,
        nodeType,
        stepNr: step + 1,
        status: stepStatus,
        input: { _name: `Step ${step}`, _success: true } as Prisma.InputJsonValue,
        output:
          stepStatus === "error"
            ? Prisma.JsonNull
            : ({
                result: `Output of ${nodeType}`,
                value: Math.random() * 100,
              } as Prisma.InputJsonValue),
        error: stepStatus === "error" ? "Connection timed out" : null,
        controlFlow:
          nodeType === "Conditional"
            ? ({ condition: step % 2 === 0 } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        meta:
          nodeType === "Prompt"
            ? ({
                ai_tokens: Math.floor(Math.random() * 1000),
                ai_model: "gpt-4o",
              } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        startedAt: stepStartedAt.toISOString(),
        finishedAt: stepFinishedAt.toISOString(),
        elapsedMs: stepFinishedAt.getTime() - stepStartedAt.getTime(),
      },
    });
  }
}

async function seedRun(
  workflowId: string,
  run: SeedRun,
  index: number,
  total: number,
): Promise<void> {
  const now = Date.now();
  const startedAt = new Date(now - (total - index) * 3_600_000);
  const finishedAt =
    run.status === "running"
      ? null
      : new Date(startedAt.getTime() + Math.floor(Math.random() * 5_000));

  const created = await prisma.workflowRun.create({
    data: {
      workflowId,
      status: run.status,
      source: run.source,
      triggerPayload: run.triggerPayload as Prisma.InputJsonValue,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt?.toISOString() ?? null,
      error: run.status === "error" ? "HTTP request failed: 503 Service Unavailable" : null,
    },
  });

  await seedSteps(created.id, run.status, startedAt);
}

const seedRunsSchema = z.object({
  workflowId: z.string().min(1, "workflowId is required"),
});

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody(req, seedRunsSchema);
    if (!parsed.ok) return parsed.response;
    const { workflowId } = parsed.data;

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const runs: SeedRun[] = [
      { status: "success", source: "webhook", triggerPayload: { event: "push", repo: "user/repo" } },
      { status: "error", source: "manual", triggerPayload: { action: "deploy" } },
      { status: "success", source: "test", triggerPayload: null },
      { status: "running", source: "webhook", triggerPayload: { issue: "New bug report" } },
      { status: "success", source: "subWorkflow", triggerPayload: { orderId: "ORD-123" } },
    ];

    for (let index = 0; index < runs.length; index++) {
      await seedRun(workflowId, runs[index], index, runs.length);
    }

    return NextResponse.json({ message: `Seeded ${runs.length} runs for workflow ${workflowId}` });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
