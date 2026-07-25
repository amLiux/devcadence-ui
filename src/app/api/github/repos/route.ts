import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";

export async function GET() {
  try {
    const token = await getGitHubToken();
    if (!token) {
      return NextResponse.json({ error: "No GitHub connection found" }, { status: 404 });
    }
    const repos = await githubFetch("/user/repos?per_page=50&sort=updated", token);
    return NextResponse.json(repos);
  } catch (error) {
    console.error("GET /api/github/repos error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch repos" },
      { status: 500 },
    );
  }
}
