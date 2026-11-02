import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { countGraph, VERSIONS_PAGE_SIZE } from "@/lib/workflows/version";

const MAX_PAGE_SIZE = 25;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      parsePositiveInt(searchParams.get("pageSize"), VERSIONS_PAGE_SIZE),
    );

    const [total, versions] = await Promise.all([
      prisma.workflowVersion.count({ where: { workflowId: id } }),
      prisma.workflowVersion.findMany({
        where: { workflowId: id },
        orderBy: { version: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // The graph payload stays on the server: the list only needs its size.
    return NextResponse.json({
      versions: versions.map((version) => ({
        id: version.id,
        version: version.version,
        name: version.name,
        description: version.description,
        type: version.type,
        status: version.status,
        source: version.source,
        createdAt: version.createdAt.toISOString(),
        ...countGraph(version),
      })),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error(
      "GET /api/workflows/[id]/versions error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}
