import { githubFetch } from "@/lib/github";
import type { NodeHandlerResult } from "./types";

/** Handles GitHub trigger nodes — fetches data from GitHub to simulate webhook events. */
export async function handleGithubTrigger(
  title: string,
  meta: Record<string, string>,
  token: string,
): Promise<NodeHandlerResult> {
  const repo = meta.repo;
  if (!repo) {
    return { success: false, message: "Repository is required" };
  }

  switch (title) {
    case "Listen Commits": {
      const branch = meta.branch || "main";
      const commits = await githubFetch(`/repos/${repo}/commits?sha=${branch}&per_page=3`, token);
      if (commits.length === 0) {
        return { success: true, message: `No recent commits on branch "${branch}"` };
      }
      return {
        success: true,
        message: `Would trigger on ${commits.length} recent commit(s) on "${branch}"`,
        data: commits.map((c: { sha: string; commit: { message: string } }) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
        })),
      };
    }

    case "Listen Pull Requests": {
      const prs = await githubFetch(`/repos/${repo}/pulls?state=open&per_page=3`, token);
      if (prs.length === 0) {
        return { success: true, message: "No open pull requests" };
      }
      return {
        success: true,
        message: `Would trigger on ${prs.length} open PR(s)`,
        data: prs.map((pr: { number: number; title: string; user: { login: string } }) => ({
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
        })),
      };
    }

    case "Listen Issues": {
      const issues = await githubFetch(`/repos/${repo}/issues?state=open&per_page=3`, token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = issues.filter((i: any) => !i.pull_request);
      if (filtered.length === 0) {
        return { success: true, message: "No open issues" };
      }
      return {
        success: true,
        message: `Would trigger on ${filtered.length} open issue(s)`,
        data: filtered.map((i: { number: number; title: string; user: { login: string } }) => ({
          number: i.number,
          title: i.title,
          author: i.user.login,
        })),
      };
    }

    case "Listen Comments": {
      const issues = await githubFetch(
        `/repos/${repo}/issues?state=open&sort=updated&per_page=5`,
        token,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withComments = issues.filter((i: any) => i.comments > 0);
      if (withComments.length === 0) {
        return { success: true, message: "No issues/PRs with recent comments" };
      }
      return {
        success: true,
        message: `Would trigger on issues with comments (${withComments.length} found)`,
        data: withComments.map((i: { number: number; title: string; comments: number }) => ({
          number: i.number,
          title: i.title,
          commentCount: i.comments,
        })),
      };
    }

    case "Listen Releases": {
      const releases = await githubFetch(`/repos/${repo}/releases?per_page=3`, token);
      if (releases.length === 0) {
        return { success: true, message: "No releases found" };
      }
      return {
        success: true,
        message: `Found ${releases.length} release(s)`,
        data: releases.map((r: { tag_name: string; name: string; published_at: string }) => ({
          tag: r.tag_name,
          name: r.name,
          publishedAt: r.published_at,
        })),
      };
    }

    default:
      return { success: false, message: `Unknown trigger: ${title}` };
  }
}
