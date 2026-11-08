import { githubFetch, getGitHubToken } from "@/lib/github";
import { resolveTemplates, type ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

type Resolve = (value: string) => string;
type ActionHandler = (
  meta: Record<string, string>,
  token: string,
  resolve: Resolve,
) => Promise<NodeHandlerResult>;

async function createIssue(
  meta: Record<string, string>,
  token: string,
  resolve: Resolve,
): Promise<NodeHandlerResult> {
  if (!meta.repo) return { success: false, message: "Repository is required" };
  if (!meta.title) return { success: false, message: "Issue title is required" };

  const issue = await githubFetch(`/repos/${meta.repo}/issues`, token, {
    method: "POST",
    body: JSON.stringify({
      title: resolve(meta.title),
      body: resolve(
        meta.body || `[Test] Created by devdock workflow at ${new Date().toISOString()}`,
      ),
      labels: meta.labels ? meta.labels.split(",").map((label) => label.trim()) : [],
      assignees: meta.assignees ? meta.assignees.split(",").map((user) => user.trim()) : [],
    }),
  });

  return {
    success: true,
    message: `Created issue #${issue.number}: ${issue.title}`,
    data: { number: issue.number, url: issue.html_url },
  };
}

async function addComment(
  meta: Record<string, string>,
  token: string,
  resolve: Resolve,
): Promise<NodeHandlerResult> {
  if (!meta.repo) return { success: false, message: "Repository is required" };
  if (!meta.issueNumber) return { success: false, message: "Issue/PR number is required" };
  if (!meta.body) return { success: false, message: "Comment body is required" };

  const comment = await githubFetch(
    `/repos/${meta.repo}/issues/${meta.issueNumber}/comments`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        body: resolve(
          `${meta.body}\n\n---\n🧪 *Test comment by devdock at ${new Date().toISOString()}`,
        ),
      }),
    },
  );

  return {
    success: true,
    message: `Added comment on #${meta.issueNumber}`,
    data: { url: comment.html_url },
  };
}

async function addLabel(
  meta: Record<string, string>,
  token: string,
): Promise<NodeHandlerResult> {
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

async function requestReview(
  meta: Record<string, string>,
  token: string,
): Promise<NodeHandlerResult> {
  if (!meta.repo) return { success: false, message: "Repository is required" };
  if (!meta.prNumber) return { success: false, message: "PR number is required" };
  if (!meta.reviewers) return { success: false, message: "Reviewers are required" };

  const reviewers = meta.reviewers.split(",").map((reviewer) => reviewer.trim());
  await githubFetch(`/repos/${meta.repo}/pulls/${meta.prNumber}/reviews`, token, {
    method: "POST",
    body: JSON.stringify({ reviewers }),
  });

  return {
    success: true,
    message: `Requested review from ${reviewers.join(", ")} on PR #${meta.prNumber}`,
  };
}

const ACTIONS: Record<string, ActionHandler> = {
  "Create Issue": createIssue,
  "Add Comment": addComment,
  "Add Label": addLabel,
  "Request Review": requestReview,
};

/** Handles GitHub action nodes — creates issues, comments, labels, and review requests. */
export async function handleGithubAction(
  title: string,
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const token = await getGitHubToken();
  if (!token) {
    return {
      success: false,
      message: "No GitHub connection found. Add a GitHub connection in Settings.",
    };
  }

  const action = ACTIONS[title];
  if (!action) {
    return { success: false, message: `Unknown action: ${title}` };
  }

  return action(meta, token, (value) => resolveTemplates(value, ancestorChain));
}
