import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";

interface CommentBody {
  body: string;
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
    const body = (await req.json()) as CommentBody;

    // The issue/PR number should be in the query string: ?issue_number=42
    const url = new URL(req.url);
    const issueNumber = url.searchParams.get("issue_number");
    if (!issueNumber) {
      return NextResponse.json({ error: "issue_number query param required" }, { status: 400 });
    }

    const comment = await githubFetch(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ body: body.body }),
      },
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error(
      "POST /api/github/repos/comments error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add comment" },
      { status: 500 },
    );
  }
}
