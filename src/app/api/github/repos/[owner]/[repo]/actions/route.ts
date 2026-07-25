import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const token = await getGitHubToken();
    if (!token) {
      return NextResponse.json({ error: "No GitHub connection found" }, { status: 404 });
    }
    const { owner, repo } = await params;
    const runs = await githubFetch(`/repos/${owner}/${repo}/actions/runs?per_page=20`, token);
    return NextResponse.json(runs);
  } catch (error) {
    console.error(
      "GET /api/github/repos/actions error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch CI runs" },
      { status: 500 },
    );
  }
}
