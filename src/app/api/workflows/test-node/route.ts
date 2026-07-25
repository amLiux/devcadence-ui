import { NextResponse } from "next/server";
import { getGitHubToken, githubFetch } from "@/lib/github";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import type { EditorNode, EditorEdge, NodeDebugLog, LogEntry } from "@/lib/types";

interface TestNodeRequest {
  node: EditorNode;
  edges?: EditorEdge[];
  allNodes?: EditorNode[];
}

interface ContextStep {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
  success: boolean;
  error: string | null;
  previousStep?: ContextStep;
}

interface TestResult {
  success: boolean;
  action: string;
  message: string;
  cached?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

async function testAction(
  title: string,
  meta: Record<string, string>,
  token: string,
): Promise<TestResult> {
  switch (title) {
    case "Create Issue": {
      if (!meta.repo) {
        return { success: false, action: title, message: "Repository is required" };
      }
      if (!meta.title) {
        return { success: false, action: title, message: "Issue title is required" };
      }
      const issue = await githubFetch(`/repos/${meta.repo}/issues`, token, {
        method: "POST",
        body: JSON.stringify({
          title: meta.title,
          body:
            meta.body || `[Test] Created by devdock workflow test at ${new Date().toISOString()}`,
          labels: meta.labels ? meta.labels.split(",").map((l) => l.trim()) : [],
          assignees: meta.assignees ? meta.assignees.split(",").map((a) => a.trim()) : [],
        }),
      });
      return {
        success: true,
        action: title,
        message: `Created issue #${issue.number}: ${issue.title}`,
        data: { number: issue.number, url: issue.html_url },
      };
    }

    case "Add Comment": {
      if (!meta.repo) {
        return { success: false, action: title, message: "Repository is required" };
      }
      if (!meta.issueNumber) {
        return { success: false, action: title, message: "Issue/PR number is required" };
      }
      if (!meta.body) {
        return { success: false, action: title, message: "Comment body is required" };
      }
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
        action: title,
        message: `Added comment on #${meta.issueNumber}`,
        data: { url: comment.html_url },
      };
    }

    case "Add Label": {
      if (!meta.repo) {
        return { success: false, action: title, message: "Repository is required" };
      }
      if (!meta.issueNumber) {
        return { success: false, action: title, message: "Issue/PR number is required" };
      }
      if (!meta.label) {
        return { success: false, action: title, message: "Label is required" };
      }
      await githubFetch(`/repos/${meta.repo}/issues/${meta.issueNumber}/labels`, token, {
        method: "POST",
        body: JSON.stringify({ labels: [meta.label] }),
      });
      return {
        success: true,
        action: title,
        message: `Added label "${meta.label}" to #${meta.issueNumber}`,
      };
    }

    case "Request Review": {
      if (!meta.repo) {
        return { success: false, action: title, message: "Repository is required" };
      }
      if (!meta.prNumber) {
        return { success: false, action: title, message: "PR number is required" };
      }
      if (!meta.reviewers) {
        return { success: false, action: title, message: "Reviewers are required" };
      }
      const reviewers = meta.reviewers.split(",").map((r) => r.trim());
      await githubFetch(`/repos/${meta.repo}/pulls/${meta.prNumber}/reviews`, token, {
        method: "POST",
        body: JSON.stringify({ reviewers }),
      });
      return {
        success: true,
        action: title,
        message: `Requested review from ${reviewers.join(", ")} on PR #${meta.prNumber}`,
      };
    }

    case "HTTP Request": {
      if (!meta.url) {
        return { success: false, action: title, message: "URL is required" };
      }
      const method = (meta.method || "GET").toUpperCase();
      let headers: Record<string, string> = {};
      if (meta.headers) {
        try {
          headers = JSON.parse(meta.headers);
        } catch {
          return { success: false, action: title, message: "Invalid headers JSON" };
        }
      }

      // Cache GET requests for 5 minutes
      if (method === "GET") {
        const cacheKeyStr = cacheKey(["http", meta.url, JSON.stringify(headers)]);
        const cached = cacheGet(cacheKeyStr);
        if (cached) {
          return {
            success: true,
            action: title,
            message: `${method} ${meta.url} → 200 (cached)`,
            cached: true,
            data: cached.data,
          };
        }
        const res = await fetch(meta.url, { method, headers });
        const body = await res.text();
        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          parsedBody = body.slice(0, 500);
        }
        if (res.ok) {
          cacheSet(cacheKeyStr, parsedBody);
        }
        return {
          success: res.ok,
          action: title,
          message: `${method} ${meta.url} → ${res.status}`,
          cached: false,
          data: { status: res.status, body: parsedBody },
        };
      }

      // Non-GET: no caching
      const res = await fetch(meta.url, { method, headers });
      const body = await res.text();
      return {
        success: res.ok,
        action: title,
        message: `${method} ${meta.url} → ${res.status}`,
        cached: false,
        data: { status: res.status, body: body.slice(0, 500) },
      };
    }

    case "Transform Data": {
      if (!meta.expression) {
        return { success: false, action: title, message: "No expression configured" };
      }
      try {
        const fn = new Function("item", `return (${meta.expression})(item)`);
        const sample = meta.body ? JSON.parse(meta.body) : { example: "data" };
        const result = fn(sample);
        return {
          success: true,
          action: title,
          message: `Transform applied successfully`,
          data: result,
        };
      } catch (err) {
        return {
          success: false,
          action: title,
          message: `Expression error: ${err instanceof Error ? err.message : "invalid expression"}`,
        };
      }
    }

    default:
      return { success: false, action: title, message: `Unknown action: ${title}` };
  }
}

async function testTrigger(
  title: string,
  meta: Record<string, string>,
  token: string,
): Promise<TestResult> {
  const repo = meta.repo;
  if (!repo) {
    return { success: false, action: title, message: "Repository is required" };
  }

  switch (title) {
    case "Listen Commits": {
      const branch = meta.branch || "main";
      const commits = await githubFetch(`/repos/${repo}/commits?sha=${branch}&per_page=3`, token);
      if (commits.length === 0) {
        return {
          success: true,
          action: title,
          message: `No recent commits on branch "${branch}"`,
        };
      }
      return {
        success: true,
        action: title,
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
        return {
          success: true,
          action: title,
          message: "No open pull requests",
        };
      }
      return {
        success: true,
        action: title,
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
      const filtered = issues.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => !i.pull_request,
      );
      if (filtered.length === 0) {
        return {
          success: true,
          action: title,
          message: "No open issues",
        };
      }
      return {
        success: true,
        action: title,
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
        return {
          success: true,
          action: title,
          message: "No issues/PRs with recent comments",
        };
      }
      return {
        success: true,
        action: title,
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
        return {
          success: true,
          action: title,
          message: "No releases found",
        };
      }
      return {
        success: true,
        action: title,
        message: `Would trigger on releases (${releases.length} found)`,
        data: releases.map((r: { tag_name: string; name: string; published_at: string }) => ({
          tag: r.tag_name,
          name: r.name,
          publishedAt: r.published_at,
        })),
      };
    }

    default:
      return { success: false, action: title, message: `Unknown trigger: ${title}` };
  }
}

async function testTransformData(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<TestResult> {
  if (!meta.expression) {
    return { success: false, action: "Transform Data", message: "No expression configured" };
  }
  try {
    const fn = new Function("item", `return (${meta.expression})(item)`);
    let input: unknown;
    if (ancestorChain) {
      input = { previousStep: ancestorChain };
    } else if (meta.body) {
      input = JSON.parse(meta.body);
    } else {
      input = { example: "data" };
    }
    const result = fn(input);
    return {
      success: true,
      action: "Transform Data",
      message: "Transform applied successfully",
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      action: "Transform Data",
      message: `Expression error: ${err instanceof Error ? err.message : "invalid expression"}`,
    };
  }
}

async function testConditional(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<TestResult> {
  if (!meta.expression) {
    return { success: false, action: "Conditional", message: "No condition configured" };
  }
  try {
    const fn = new Function("item", `return (${meta.expression})(item)`);
    let input: unknown;
    if (ancestorChain) {
      input = { previousStep: ancestorChain };
    } else if (meta.body) {
      input = JSON.parse(meta.body);
    } else {
      input = { example: "data" };
    }
    const result = fn(input);
    const condition = Boolean(result);
    return {
      success: true,
      action: "Conditional",
      message: `Condition evaluated to ${condition}`,
      data: { condition, result },
    };
  } catch (err) {
    return {
      success: false,
      action: "Conditional",
      message: `Expression error: ${err instanceof Error ? err.message : "invalid expression"}`,
    };
  }
}

export async function POST(req: Request) {
  try {
    const { node, edges, allNodes } = (await req.json()) as TestNodeRequest;
    const token = await getGitHubToken();

    if (!token) {
      return NextResponse.json(
        { success: false, action: node.data.title, message: "No GitHub connection found" },
        { status: 404 },
      );
    }

    const meta = (node.data.metadata || {}) as Record<string, string>;
    const { title, type } = node.data;

    // Build ancestor chain by executing parent nodes if edges provided
    let ancestorChain: ContextStep | undefined;
    if (edges && allNodes && edges.length > 0) {
      const parents = new Map<string, string[]>();
      for (const e of edges) {
        if (!parents.has(e.target)) parents.set(e.target, []);
        parents.get(e.target)!.push(e.source);
      }

      // Execute parent nodes recursively to get their outputs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parentOutputs = new Map<string, any>();

      async function executeParentChain(parentNodeId: string): Promise<void> {
        if (parentOutputs.has(parentNodeId)) return;
        const parentNode = allNodes?.find((n) => n.id === parentNodeId);
        if (!parentNode) return;

        // Execute grandparent first
        const grandparentIds = parents.get(parentNodeId) || [];
        for (const gpId of grandparentIds) {
          await executeParentChain(gpId);
        }

        // Execute this parent
        const parentMeta = (parentNode.data.metadata || {}) as Record<string, string>;
        let parentResult: { success: boolean; data?: unknown };
        try {
          const parentTitle = String(parentNode.data.title || "Unknown");
          if (parentNode.data.type === "GitHub" && parentTitle.startsWith("Listen")) {
            parentResult = await testTrigger(parentTitle, parentMeta, token!);
          } else {
            parentResult = await testAction(parentTitle, parentMeta, token!);
          }
        } catch {
          parentResult = { success: false, data: null };
        }
        parentOutputs.set(parentNodeId, {
          data: parentResult.data ?? null,
          success: parentResult.success,
          error: parentResult.success ? null : "Execution failed",
        });
      }

      // Find and execute all parent nodes
      const parentIds = parents.get(node.id) || [];
      for (const parentId of parentIds) {
        await executeParentChain(parentId);
      }

      // Build the chain from executed parent outputs
      function buildChainFromOutputs(nodeId: string): ContextStep | undefined {
        const pIds = parents.get(nodeId);
        if (!pIds || pIds.length === 0) return undefined;
        const parentId = pIds[0];
        const parentOutput = parentOutputs.get(parentId);
        if (!parentOutput) return undefined;
        const parentNode = allNodes?.find((n) => n.id === parentId);
        const grandparentChain = buildChainFromOutputs(parentId);
        const step: ContextStep = {
          name: parentNode?.data.title ?? "Unknown",
          output: parentOutput.data ?? null,
          success: parentOutput.success,
          error: parentOutput.error,
        };
        if (grandparentChain) {
          step.previousStep = grandparentChain;
        }
        return step;
      }

      ancestorChain = buildChainFromOutputs(node.id);
    }

    const now = () => new Date().toISOString();
    const logs: LogEntry[] = [];

    logs.push({ type: "info", message: `Starting ${title}...`, timestamp: now() });

    let result: TestResult;
    try {
      if (title === "Conditional") {
        result = await testConditional(meta, ancestorChain);
      } else if (title === "Transform Data") {
        result = await testTransformData(meta, ancestorChain);
      } else if (type === "GitHub" && title.startsWith("Listen")) {
        result = await testTrigger(title, meta, token);
      } else {
        result = await testAction(title, meta, token);
      }
    } catch (err) {
      result = {
        success: false,
        action: title,
        message: err instanceof Error ? err.message : "Execution failed",
      };
    }

    logs.push({
      type: result.success ? "success" : "error",
      message: result.message,
      timestamp: now(),
    });

    if (result.data) {
      logs.push({
        type: "info",
        message: `Output: ${JSON.stringify(result.data, null, 2)}`,
        timestamp: now(),
      });
    }

    const debugLog: NodeDebugLog = {
      nodeId: node.id,
      title,
      success: result.success,
      logs,
    };

    return NextResponse.json({
      ...debugLog,
      data: result.data ?? null,
      cached: result.cached ?? false,
    });
  } catch (error) {
    console.error(
      "POST /api/workflows/test-node error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        nodeId: "unknown",
        title: "Unknown",
        success: false,
        logs: [
          {
            type: "error",
            message: error instanceof Error ? error.message : "Test failed",
            timestamp: new Date().toISOString(),
          },
        ],
      } satisfies NodeDebugLog,
      { status: 500 },
    );
  }
}
