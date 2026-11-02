import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { countGraph } from "@/lib/workflows/version";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { id, versionId } = await params;
    const version = await prisma.workflowVersion.findUnique({ where: { id: versionId } });

    if (!version || version.workflowId !== id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...version,
      createdAt: version.createdAt.toISOString(),
      ...countGraph(version),
    });
  } catch (error) {
    console.error(
      "GET /api/workflows/[id]/versions/[versionId] error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to fetch version" }, { status: 500 });
  }
}
