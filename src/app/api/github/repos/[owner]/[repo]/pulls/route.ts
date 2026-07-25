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
    const key = cacheKey(["pulls", owner, repo, "open"]);
    const cached = cacheGet(key);
    if (cached) {
      return NextResponse.json({ data: cached.data, cached: true });
    }
    const pulls = await githubFetch(`/repos/${owner}/${repo}/pulls?state=open&per_page=20`, token);
    cacheSet(key, pulls);
    return NextResponse.json({ data: pulls, cached: false });
  } catch (error) {
    console.error(
      "GET /api/github/repos/pulls error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pull requests" },
      { status: 500 },
    );
  }
}
