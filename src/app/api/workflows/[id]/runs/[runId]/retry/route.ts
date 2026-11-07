import { NextResponse } from "next/server";
import { executeWorkflowRun } from "@/lib/workflows/execute-workflow";
import { retryRunManually } from "@/lib/workflows/run-retries";
import type { WorkflowJobData } from "@/lib/queue";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  try {
    const { id, runId } = await params;
    const retry = await retryRunManually(id, runId);
    if (!retry.ok) {
      return NextResponse.json({ error: retry.error }, { status: retry.status });
    }

    // Execute inline so a manual retry works without the queue worker running.
    const result = await executeWorkflowRun({
      workflowId: id,
      source: retry.source as WorkflowJobData["source"],
      body: retry.body,
      runId: retry.runId,
    });

    return NextResponse.json({
      runId: retry.runId,
      attempt: retry.attempt,
      success: result.success,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error(
      "POST /api/workflows/[id]/runs/[runId]/retry error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to retry run" }, { status: 500 });
  }
}
