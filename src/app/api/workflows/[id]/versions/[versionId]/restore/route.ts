import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncSchedules, unregisterSchedule } from "@/lib/scheduler";
import { serializeWorkflow } from "@/lib/workflows/serialize";
import { recordVersion } from "@/lib/workflows/version-store";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { id, versionId } = await params;

    const [workflow, version] = await Promise.all([
      prisma.workflow.findUnique({ where: { id } }),
      prisma.workflowVersion.findUnique({ where: { id: versionId } }),
    ]);

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    if (!version || version.workflowId !== id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // The state being replaced is stored first, so a restore can itself be undone.
    const updated = await prisma.$transaction(async (tx) => {
      const next = {
        id: workflow.id,
        name: version.name,
        description: version.description,
        type: version.type,
        nodes: version.nodes,
        edges: version.edges,
        status: version.status,
      };

      await recordVersion(tx, workflow, next, "restore");

      return tx.workflow.update({
        where: { id },
        data: {
          name: version.name,
          description: version.description,
          type: version.type,
          nodes: version.nodes,
          edges: version.edges,
          status: version.status,
        },
      });
    });

    if (updated.status === "active") {
      await syncSchedules();
    } else {
      await unregisterSchedule(id);
    }

    return NextResponse.json({ success: true, workflow: serializeWorkflow(updated) });
  } catch (error) {
    console.error(
      "POST /api/workflows/[id]/versions/[versionId]/restore error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to restore version" }, { status: 500 });
  }
}
