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
    const branches = await githubFetch(`/repos/${owner}/${repo}/branches?per_page=100`, token);
    return NextResponse.json({ data: branches });
  } catch (error) {
    console.error(
      "GET /api/github/repos/branches error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branches" },
      { status: 500 },
    );
  }
}
