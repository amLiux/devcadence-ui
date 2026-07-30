import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("GET /api/workflows/[id]/runs error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}
