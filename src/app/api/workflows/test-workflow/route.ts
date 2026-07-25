import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGitHubToken, githubFetch } from "@/lib/github";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import type { EditorNode, EditorEdge, NodeDebugLog, LogEntry } from "@/lib/types";

interface NodeResult {
  nodeId: string;
  title: string;
  success: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface TestWorkflowRequest {
  workflowId: string;
  nodes?: EditorNode[];
  edges?: EditorEdge[];
}

interface ContextStep {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
  success: boolean;
  error: string | null;
  previousStep?: ContextStep;
}

async function executeNode(
  node: EditorNode,
  token: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorOutputs: Map<string, any>,
  ancestorChain: ContextStep | undefined,
): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const meta = (node.data.metadata || {}) as Record<string, string>;
  const { title, type } = node.data;
  const now = () => new Date().toISOString();
  const logs: LogEntry[] = [];

  logs.push({ type: "info", message: `Starting ${title}...`, timestamp: now() });

  try {
    let result: { success: boolean; message: string; data?: unknown };

    if (title === "Conditional") {
      result = await executeConditional(meta, ancestorChain);
    } else if (title === "Transform Data") {
      result = await executeTransformData(meta, ancestorChain);
    } else if (type === "GitHub" && title.startsWith("Listen")) {
      result = await executeTrigger(title, meta, token, node.id);
    } else {
      result = await executeAction(title, meta, token, node.id);
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

    return {
      debugLog: { nodeId: node.id, title, success: result.success, logs },
      data: result.data,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Execution failed";
    logs.push({ type: "error", message: msg, timestamp: now() });
    return {
      debugLog: { nodeId: node.id, title, success: false, logs },
      data: undefined,
    };
  }
}

async function executeTrigger(
  title: string,
  meta: Record<string, string>,
  token: string,
  nodeId: string,
): Promise<NodeResult> {
  switch (title) {
    case "Listen Commits": {
      if (!meta.repo) return { nodeId, title, success: false, message: "Repository is required" };
      const branch = meta.branch || "main";
      const commits = await githubFetch(
        `/repos/${meta.repo}/commits?sha=${branch}&per_page=5`,
        token,
      );
      return {
        nodeId,
        title,
        success: true,
        message: `Found ${commits.length} recent commit(s)`,
        data: commits.slice(0, 3).map((c: { sha: string; commit: { message: string } }) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
        })),
      };
    }
    case "Listen Pull Requests": {
      if (!meta.repo) return { nodeId, title, success: false, message: "Repository is required" };
      const prs = await githubFetch(`/repos/${meta.repo}/pulls?state=open&per_page=5`, token);
      return {
        nodeId,
        title,
        success: true,
        message: `Found ${prs.length} open PR(s)`,
        data: prs.slice(0, 3).map((pr: { number: number; title: string }) => ({
          number: pr.number,
          title: pr.title,
        })),
      };
    }
    case "Listen Issues": {
      if (!meta.repo) return { nodeId, title, success: false, message: "Repository is required" };
      const issues = await githubFetch(`/repos/${meta.repo}/issues?state=open&per_page=5`, token);
      const filtered = issues.filter((i: { pull_request?: unknown }) => !i.pull_request);
      return {
        nodeId,
        title,
        success: true,
        message: `Found ${filtered.length} open issue(s)`,
        data: filtered.slice(0, 3).map((i: { number: number; title: string }) => ({
          number: i.number,
          title: i.title,
        })),
      };
    }
    case "Listen Comments": {
      if (!meta.repo) return { nodeId, title, success: false, message: "Repository is required" };
      const issues = await githubFetch(
        `/repos/${meta.repo}/issues?state=open&sort=updated&per_page=5`,
        token,
      );
      const withComments = issues.filter((i: { comments: number }) => i.comments > 0);
      return {
        nodeId,
        title,
        success: true,
        message: `Found ${withComments.length} issue(s) with comments`,
      };
    }
    case "Listen Releases": {
      if (!meta.repo) return { nodeId, title, success: false, message: "Repository is required" };
      const releases = await githubFetch(`/repos/${meta.repo}/releases?per_page=3`, token);
      return {
        nodeId,
        title,
        success: true,
        message: `Found ${releases.length} release(s)`,
      };
    }
    default:
      return { nodeId, title, success: false, message: `Unknown trigger: ${title}` };
  }
}

async function executeTransformData(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<{ success: boolean; message: string; data?: unknown }> {
  if (!meta.expression) {
    return { success: false, message: "No expression configured" };
  }
  try {
    const fn = new Function("item", `return (${meta.expression})(item)`);
    // Pass ancestor chain if connected, otherwise use sample input
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
      message: "Transform applied successfully",
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      message: `Expression error: ${err instanceof Error ? err.message : "invalid expression"}`,
    };
  }
}

async function executeConditional(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<{ success: boolean; message: string; data?: unknown }> {
  if (!meta.expression) {
    return { success: false, message: "No condition configured" };
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
      message: `Condition evaluated to ${condition}`,
      data: { condition, result },
    };
  } catch (err) {
    return {
      success: false,
      message: `Expression error: ${err instanceof Error ? err.message : "invalid expression"}`,
    };
  }
}

async function executeAction(
  title: string,
  meta: Record<string, string>,
  token: string,
  nodeId: string,
): Promise<NodeResult> {
  switch (title) {
    case "Create Issue": {
      if (!meta.repo) return { nodeId, title, success: false, message: "Repository is required" };
      if (!meta.title) {
        return { nodeId, title, success: false, message: "Issue title is required" };
      }
      const issue = await githubFetch(`/repos/${meta.repo}/issues`, token, {
        method: "POST",
        body: JSON.stringify({
          title: meta.title,
          body: meta.body || `[Test] Created by devdock workflow at ${new Date().toISOString()}`,
          labels: meta.labels ? meta.labels.split(",").map((l) => l.trim()) : [],
          assignees: meta.assignees ? meta.assignees.split(",").map((a) => a.trim()) : [],
        }),
      });
      return {
        nodeId,
        title,
        success: true,
        message: `Created issue #${issue.number}: ${issue.title}`,
        data: { number: issue.number, url: issue.html_url },
      };
    }
    case "Add Comment": {
      if (!meta.repo || !meta.issueNumber || !meta.body) {
        return {
          nodeId,
          title,
          success: false,
          message: "Repository, issue number, and comment body required",
        };
      }
      const comment = await githubFetch(
        `/repos/${meta.repo}/issues/${meta.issueNumber}/comments`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ body: meta.body }),
        },
      );
      return {
        nodeId,
        title,
        success: true,
        message: `Commented on #${meta.issueNumber}`,
        data: { url: comment.html_url },
      };
    }
    case "Add Label": {
      if (!meta.repo || !meta.issueNumber || !meta.label) {
        return {
          nodeId,
          title,
          success: false,
          message: "Repository, issue number, and label required",
        };
      }
      await githubFetch(`/repos/${meta.repo}/issues/${meta.issueNumber}/labels`, token, {
        method: "POST",
        body: JSON.stringify({ labels: [meta.label] }),
      });
      return {
        nodeId,
        title,
        success: true,
        message: `Added "${meta.label}" to #${meta.issueNumber}`,
      };
    }
    case "Request Review": {
      if (!meta.repo || !meta.prNumber || !meta.reviewers) {
        return {
          nodeId,
          title,
          success: false,
          message: "Repository, PR number, and reviewers required",
        };
      }
      const reviewers = meta.reviewers.split(",").map((r) => r.trim());
      await githubFetch(`/repos/${meta.repo}/pulls/${meta.prNumber}/reviews`, token, {
        method: "POST",
        body: JSON.stringify({ reviewers }),
      });
      return {
        nodeId,
        title,
        success: true,
        message: `Requested review from ${reviewers.join(", ")}`,
      };
    }
    case "HTTP Request": {
      if (!meta.url) {
        return { nodeId, title, success: false, message: "URL is required" };
      }
      const method = (meta.method || "GET").toUpperCase();
      let headers: Record<string, string> = {};
      if (meta.headers) {
        try {
          headers = JSON.parse(meta.headers);
        } catch {
          return { nodeId, title, success: false, message: "Invalid headers JSON" };
        }
      }

      // Cache GET requests for 5 minutes
      if (method === "GET") {
        const cacheKeyStr = cacheKey(["http", meta.url, JSON.stringify(headers)]);
        const cached = cacheGet(cacheKeyStr);
        if (cached) {
          return {
            nodeId,
            title,
            success: true,
            message: `${method} ${meta.url} → 200 (cached)`,
            data: cached.data,
          };
        }
        const res = await fetch(meta.url, { method, headers });
        let responseBody: unknown;
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            responseBody = await res.json();
          } catch {
            responseBody = await res.text();
          }
        } else {
          responseBody = await res.text();
        }
        if (res.ok) {
          cacheSet(cacheKeyStr, responseBody);
        }
        return {
          nodeId,
          title,
          success: res.ok,
          message: `${method} ${meta.url} → ${res.status}`,
          data: responseBody,
        };
      }

      // Non-GET: no caching, just execute
      const res = await fetch(meta.url, { method, headers });
      let responseBody: unknown;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try {
          responseBody = await res.json();
        } catch {
          responseBody = await res.text();
        }
      } else {
        responseBody = await res.text();
      }
      return {
        nodeId,
        title,
        success: res.ok,
        message: `${method} ${meta.url} → ${res.status}`,
        data: responseBody,
      };
    }
    default:
      return { nodeId, title, success: false, message: `Unknown action: ${title}` };
  }
}

export async function POST(req: Request) {
  try {
    const {
      workflowId,
      nodes: clientNodes,
      edges: clientEdges,
    } = (await req.json()) as TestWorkflowRequest;

    const token = await getGitHubToken();
    if (!token) {
      return NextResponse.json({ error: "No GitHub connection found" }, { status: 404 });
    }
    const ghToken: string = token;

    let nodes: EditorNode[];
    let edges: EditorEdge[];

    if (clientNodes && clientNodes.length > 0) {
      nodes = clientNodes;
      edges = clientEdges || [];
    } else {
      const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!workflow) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }
      nodes = workflow.nodes ? JSON.parse(workflow.nodes) : [];
      edges = workflow.edges ? JSON.parse(workflow.edges) : [];
    }

    if (nodes.length === 0) {
      return NextResponse.json({ error: "Workflow has no nodes" }, { status: 400 });
    }

    // Build reverse adjacency: target → [source] (parents)
    const parents = new Map<string, string[]>();
    for (const e of edges) {
      if (!parents.has(e.target)) parents.set(e.target, []);
      parents.get(e.target)!.push(e.source);
    }

    // Store outputs by node ID for building ancestor chains
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeOutputs = new Map<string, any>();

    // Topological execution
    const results: NodeDebugLog[] = [];
    const visited = new Set<string>();

    // Find root nodes (no incoming edges)
    const hasIncoming = new Set(edges.map((e) => e.target));
    const roots = nodes.filter((n: EditorNode) => !hasIncoming.has(n.id));

    // Build ancestor chain for a node by walking backwards through parents
    function buildAncestorChain(nodeId: string): ContextStep | undefined {
      const parentIds = parents.get(nodeId);
      if (!parentIds || parentIds.length === 0) return undefined;

      // Use the most recently executed parent (first in the list since we execute in order)
      const parentId = parentIds[0];
      const parentOutput = nodeOutputs.get(parentId);
      if (!parentOutput) return undefined;

      const parentNode = nodes.find((n: EditorNode) => n.id === parentId) as EditorNode | undefined;
      const grandparentChain = buildAncestorChain(parentId);

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

    // Build forward adjacency for walking (with sourceHandle for Conditional routing)
    const forward = new Map<string, { targetId: string; sourceHandle: string | null }[]>();
    for (const e of edges) {
      if (!forward.has(e.source)) forward.set(e.source, []);
      forward.get(e.source)!.push({ targetId: e.target, sourceHandle: e.sourceHandle ?? null });
    }

    async function walk(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find((n: EditorNode) => n.id === nodeId) as EditorNode | undefined;
      if (!node) return;

      const chain = buildAncestorChain(nodeId);
      const { debugLog, data } = await executeNode(node, ghToken, nodeOutputs, chain);
      results.push(debugLog);

      // Store this node's output for downstream nodes
      nodeOutputs.set(nodeId, {
        data: data ?? null,
        success: debugLog.success,
        error: debugLog.success ? null : debugLog.logs.find((l) => l.type === "error")?.message ?? "Unknown error",
      });

      const children = forward.get(nodeId) || [];

      // Handle Conditional branching via sourceHandle
      if (node.data.title === "Conditional" && data && typeof data === "object" && "condition" in data) {
        const condition = (data as { condition: boolean }).condition;
        const targetHandle = condition ? "success" : "failure";
        const matching = children.find((c) => c.sourceHandle === targetHandle);
        if (matching) {
          await walk(matching.targetId);
        }
      } else {
        for (const child of children) {
          await walk(child.targetId);
        }
      }
    }

    for (const root of roots) {
      await walk(root.id);
    }

    // Build the full context for the response (for the context viewer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullContext: Record<string, any> = {};
    for (const [nodeId, output] of nodeOutputs) {
      const node = nodes.find((n: EditorNode) => n.id === nodeId) as EditorNode | undefined;
      fullContext[nodeId] = {
        name: node?.data.title ?? "Unknown",
        ...output,
      };
    }

    const allPassed = results.every((r) => r.success);

    return NextResponse.json({
      success: allPassed,
      steps: results,
      context: fullContext,
      message: allPassed
        ? `All ${results.length} node(s) passed`
        : `${results.filter((r) => r.success).length}/${results.length} nodes passed`,
    });
  } catch (error) {
    console.error(
      "POST /api/workflows/test-workflow error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workflow test failed" },
      { status: 500 },
    );
  }
}
