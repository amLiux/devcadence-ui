import { githubFetch, getGitHubToken } from "@/lib/github";
import type { NodeHandlerResult } from "./types";

/** Handles GitHub action nodes — creates issues, comments, labels, and review requests. */
export async function handleGithubAction(
  title: string,
  meta: Record<string, string>,
): Promise<NodeHandlerResult> {
  const token = await getGitHubToken();
  if (!token) {
    return { success: false, message: "No GitHub connection found. Add a GitHub connection in Settings." };
  }

  switch (title) {
    case "Create Issue": {
      if (!meta.repo) return { success: false, message: "Repository is required" };
      if (!meta.title) return { success: false, message: "Issue title is required" };
      const issue = await githubFetch(`/repos/${meta.repo}/issues`, token, {
        method: "POST",
        body: JSON.stringify({
          title: meta.title,
          body:
            meta.body || `[Test] Created by devdock workflow at ${new Date().toISOString()}`,
          labels: meta.labels ? meta.labels.split(",").map((l) => l.trim()) : [],
          assignees: meta.assignees ? meta.assignees.split(",").map((a) => a.trim()) : [],
        }),
      });
      return {
        success: true,
        message: `Created issue #${issue.number}: ${issue.title}`,
        data: { number: issue.number, url: issue.html_url },
      };
    }

    case "Add Comment": {
      if (!meta.repo) return { success: false, message: "Repository is required" };
      if (!meta.issueNumber) return { success: false, message: "Issue/PR number is required" };
      if (!meta.body) return { success: false, message: "Comment body is required" };
      const comment = await githubFetch(
        `/repos/${meta.repo}/issues/${meta.issueNumber}/comments`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            body: `${meta.body}\n\n---\n🧪 *Test comment by devdock at ${new Date().toISOString()}`,
          }),
        },
      );
      return {
        success: true,
        message: `Added comment on #${meta.issueNumber}`,
        data: { url: comment.html_url },
      };
    }

    case "Add Label": {
      if (!meta.repo) return { success: false, message: "Repository is required" };
      if (!meta.issueNumber) return { success: false, message: "Issue/PR number is required" };
      if (!meta.label) return { success: false, message: "Label is required" };
      await githubFetch(`/repos/${meta.repo}/issues/${meta.issueNumber}/labels`, token, {
        method: "POST",
        body: JSON.stringify({ labels: [meta.label] }),
      });
      return {
        success: true,
        message: `Added label "${meta.label}" to #${meta.issueNumber}`,
      };
    }

    case "Request Review": {
      if (!meta.repo) return { success: false, message: "Repository is required" };
      if (!meta.prNumber) return { success: false, message: "PR number is required" };
      if (!meta.reviewers) return { success: false, message: "Reviewers are required" };
      const reviewers = meta.reviewers.split(",").map((r) => r.trim());
      await githubFetch(`/repos/${meta.repo}/pulls/${meta.prNumber}/reviews`, token, {
        method: "POST",
        body: JSON.stringify({ reviewers }),
      });
      return {
        success: true,
        message: `Requested review from ${reviewers.join(", ")} on PR #${meta.prNumber}`,
      };
    }

    default:
      return { success: false, message: `Unknown action: ${title}` };
  }
}
