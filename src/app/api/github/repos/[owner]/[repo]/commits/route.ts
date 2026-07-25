import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";

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
    const key = cacheKey(["commits", owner, repo]);
    const cached = cacheGet(key);
    if (cached) {
      return NextResponse.json({ data: cached.data, cached: true });
    }
    const commits = await githubFetch(`/repos/${owner}/${repo}/commits?per_page=20`, token);
    cacheSet(key, commits);
    return NextResponse.json({ data: commits, cached: false });
  } catch (error) {
    console.error(
      "GET /api/github/repos/commits error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch commits" },
      { status: 500 },
    );
  }
}
