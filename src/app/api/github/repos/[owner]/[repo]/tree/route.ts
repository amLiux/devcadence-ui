import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const token = await getGitHubToken();
    if (!token) {
      return NextResponse.json({ error: "No GitHub connection found" }, { status: 404 });
    }
    const { owner, repo } = await params;
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || "main";
    const tree = await githubFetch(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      token,
    );
    return NextResponse.json({ data: tree });
  } catch (error) {
    console.error(
      "GET /api/github/repos/tree error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tree" },
      { status: 500 },
    );
  }
}
