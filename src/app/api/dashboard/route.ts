import { NextResponse } from "next/server";
import { parseDashboardRange } from "@/lib/dashboard/format";
import { getDashboardStats } from "@/lib/dashboard/stats";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = parseDashboardRange(searchParams.get("range"));
    const stats = await getDashboardStats(range);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/dashboard error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
