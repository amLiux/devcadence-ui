import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";

interface CreateIssueBody {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

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
    const key = cacheKey(["issues", owner, repo, "open"]);
    const cached = cacheGet(key);
    if (cached) {
      return NextResponse.json({ data: cached.data, cached: true });
    }
    const issues = await githubFetch(
      `/repos/${owner}/${repo}/issues?state=open&per_page=20`,
      token,
    );
    cacheSet(key, issues);
    return NextResponse.json({ data: issues, cached: false });
  } catch (error) {
    console.error(
      "GET /api/github/repos/issues error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch issues" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const token = await getGitHubToken();
    if (!token) {
      return NextResponse.json({ error: "No GitHub connection found" }, { status: 404 });
    }
    const { owner, repo } = await params;
    const body = (await req.json()) as CreateIssueBody;

    const issue = await githubFetch(`/repos/${owner}/${repo}/issues`, token, {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        body: body.body || "",
        labels: body.labels || [],
        assignees: body.assignees || [],
      }),
    });

    // Invalidate issues cache for this repo
    cacheKey(["issues", owner, repo, "open"]);

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error(
      "POST /api/github/repos/issues error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create issue" },
      { status: 500 },
    );
  }
}
