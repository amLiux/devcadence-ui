import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  try {
    const { runId } = await params;
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { logs: { orderBy: { startedAt: "asc" } } },
    });
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json(run);
  } catch (error) {
    console.error("GET /api/workflows/[id]/runs/[runId] error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch run" }, { status: 500 });
  }
}
