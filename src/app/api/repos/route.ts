import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const repos = await prisma.repository.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(repos);
  } catch (error) {
    console.error("GET /api/repos error:", error);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}
