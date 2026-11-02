import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

interface SeedBody {
  workflowId?: string;
  all?: boolean;
  runs?: number;
  days?: number;
}

const STATUSES = ["success", "success", "error", "success", "running"] as const;
const SOURCES = ["webhook", "schedule", "manual", "webhook", "subWorkflow"] as const;
const NODE_TITLES = ["Webhook", "Transform Data", "HTTP Request", "Conditional", "Retry Loop", "Prompt"];
const ERRORS = [
  "HTTP request failed: 503 Service Unavailable",
  "Connection timed out",
  "Slack channel not found",
  "Invalid PostgreSQL credentials",
];

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/**
 * Dev-only helper: seeds runs spread over the last `days` so the dashboard and
 * the execution history have something real to show.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SeedBody;
    const runCount = clamp(body.runs, 1, 100, 5);
    const days = clamp(body.days, 1, 30, 7);

    const workflows = body.all
      ? await prisma.workflow.findMany({ select: { id: true, name: true } })
      : body.workflowId
        ? await prisma.workflow.findMany({
            where: { id: body.workflowId },
            select: { id: true, name: true },
          })
        : [];

    if (workflows.length === 0) {
      return NextResponse.json(
        { error: "workflowId required, or pass all: true" },
        { status: 400 },
      );
    }

    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    let created = 0;

    for (const [workflowIndex, workflow] of workflows.entries()) {
      for (let index = 0; index < runCount; index++) {
        const status = STATUSES[(index + workflowIndex) % STATUSES.length];
        const source = SOURCES[(index + workflowIndex) % SOURCES.length];
        const startedAt = new Date(now - Math.random() * windowMs);
        const finishedAt =
          status === "running"
            ? null
            : new Date(startedAt.getTime() + 300 + Math.floor(Math.random() * 8000));

        const run = await prisma.workflowRun.create({
          data: {
            workflowId: workflow.id,
            status,
            source,
            triggerPayload: { seed: true, index } as Prisma.InputJsonValue,
            startedAt,
            finishedAt,
            error: status === "error" ? ERRORS[index % ERRORS.length] : null,
          },
        });

        const stepCount = Math.floor(Math.random() * 4) + 3;
        const failingStep = status === "error" ? Math.floor(Math.random() * stepCount) : -1;

        for (let step = 0; step < stepCount; step++) {
          const stepStartedAt = new Date(startedAt.getTime() + step * 800);
          const stepFinishedAt = new Date(stepStartedAt.getTime() + 50 + Math.floor(Math.random() * 400));
          const stepStatus = step === failingStep ? "error" : "success";
          const nodeType = NODE_TITLES[step % NODE_TITLES.length];

          await prisma.workflowLog.create({
            data: {
              runId: run.id,
              nodeId: `${nodeType}-${step}`,
              nodeType,
              stepNr: step + 1,
              status: stepStatus,
              input: { _name: `Step ${step}`, _success: true } as Prisma.InputJsonValue,
              output:
                stepStatus === "error"
                  ? Prisma.JsonNull
                  : ({ result: `Output of ${nodeType}`, value: Math.random() * 100 } as Prisma.InputJsonValue),
              error: stepStatus === "error" ? ERRORS[step % ERRORS.length] : null,
              controlFlow:
                nodeType === "Conditional"
                  ? ({ condition: step % 2 === 0 } as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              meta:
                nodeType === "Prompt"
                  ? ({ ai_tokens: Math.floor(Math.random() * 1200), ai_model: "gpt-4o" } as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              startedAt: stepStartedAt,
              finishedAt: stepFinishedAt,
              elapsedMs: stepFinishedAt.getTime() - stepStartedAt.getTime(),
            },
          });
        }

        created += 1;
      }
    }

    return NextResponse.json({
      message: `Seeded ${created} runs across ${workflows.length} workflow(s) over ${days} day(s)`,
    });
  } catch (error) {
    console.error("Seed error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}

/** Dev-only clean-up: removes the runs created by this endpoint. */
export async function DELETE() {
  try {
    const seeded = { triggerPayload: { path: ["seed"], equals: true } };

    const removed = await prisma.$transaction(async (tx) => {
      await tx.workflowLog.deleteMany({ where: { run: seeded } });
      return tx.workflowRun.deleteMany({ where: seeded });
    });

    return NextResponse.json({ message: `Removed ${removed.count} seeded runs` });
  } catch (error) {
    console.error("Seed cleanup error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Seed cleanup failed" }, { status: 500 });
  }
}

