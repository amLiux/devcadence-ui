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
    const key = cacheKey(["contributors", owner, repo]);
    const cached = cacheGet(key);
    if (cached) {
      return NextResponse.json({ data: cached.data, cached: true });
    }
    const contributors = await githubFetch(
      `/repos/${owner}/${repo}/contributors?per_page=50`,
      token,
    );
    cacheSet(key, contributors);
    return NextResponse.json({ data: contributors, cached: false });
  } catch (error) {
    console.error(
      "GET /api/github/repos/contributors error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contributors" },
      { status: 500 },
    );
  }
}
