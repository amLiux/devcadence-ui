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
    const key = cacheKey(["labels", owner, repo]);
    const cached = cacheGet(key);
    if (cached) {
      return NextResponse.json({ data: cached.data, cached: true });
    }
    const labels = await githubFetch(`/repos/${owner}/${repo}/labels?per_page=100`, token);
    cacheSet(key, labels);
    return NextResponse.json({ data: labels, cached: false });
  } catch (error) {
    console.error(
      "GET /api/github/repos/labels error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch labels" },
      { status: 500 },
    );
  }
}
