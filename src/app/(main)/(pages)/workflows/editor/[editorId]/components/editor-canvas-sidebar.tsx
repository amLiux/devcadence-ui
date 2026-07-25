"use client";

import React from "react";
import { GitBranch, Zap, Settings, GripVertical, GitFork } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEditor } from "@/providers/editor-provider";
import type { EditorNodeData } from "@/lib/types";
import { GitHubRepoSelect } from "@/components/composed/github-repo-select";
import { GitHubLabelsSelect } from "@/components/composed/github-labels-select";
import { GitHubAssigneesSelect } from "@/components/composed/github-assignees-select";
import { GitHubIssueSelect } from "@/components/composed/github-issue-select";

interface NodeCardDef {
  type: EditorNodeData["type"];
  title: string;
  description: string;
}

const triggerNodes: NodeCardDef[] = [
  { type: "Trigger", title: "Webhook", description: "Trigger on incoming webhook event" },
  { type: "Trigger", title: "Schedule", description: "Trigger on a cron schedule" },
  { type: "GitHub", title: "Listen Commits", description: "Trigger on new pushes to a repo" },
  {
    type: "GitHub",
    title: "Listen Pull Requests",
    description: "Trigger on PR events (open, close, merge)",
  },
  {
    type: "GitHub",
    title: "Listen Issues",
    description: "Trigger on issue events (open, close, label)",
  },
  { type: "GitHub", title: "Listen Comments", description: "Trigger on comments on issues or PRs" },
  { type: "GitHub", title: "Listen Releases", description: "Trigger when a release is published" },
];

const actionNodes: NodeCardDef[] = [
  {
    type: "GitHub",
    title: "Create Issue",
    description: "Create a new issue with labels and assignees",
  },
  { type: "GitHub", title: "Add Comment", description: "Post a comment on an issue or PR" },
  { type: "GitHub", title: "Add Label", description: "Add a label to an issue or PR" },
  { type: "GitHub", title: "Request Review", description: "Request a review on a pull request" },
  { type: "Action", title: "HTTP Request", description: "Make an HTTP request to an API" },
  { type: "Action", title: "Transform Data", description: "Map, filter, or transform data" },
  { type: "Action", title: "Conditional", description: "Branch based on a condition (success/failure paths)" },
];

const iconMap: Record<string, React.ReactNode> = {
  Trigger: <Zap className="h-3 w-3 text-yellow-500" />,
  Action: <Settings className="h-3 w-3 text-blue-500" />,
  GitHub: <GitBranch className="h-3 w-3 text-foreground" />,
  Conditional: <GitFork className="h-3 w-3 text-orange-500" />,
};

function DraggableCard({ node }: { node: NodeCardDef }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow-type", node.type);
    event.dataTransfer.setData("application/reactflow-title", node.title);
    event.dataTransfer.setData("application/reactflow-description", node.description);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Card
            size="sm"
            draggable
            onDragStart={onDragStart}
            className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors py-1.5"
          >
            <CardContent className="px-2 py-0 flex items-center gap-1.5">
              <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
                {iconMap[node.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium leading-tight truncate">{node.title}</p>
              </div>
            </CardContent>
          </Card>
        }
      />
      <TooltipContent side="left" className="max-w-[200px]">
        <p className="text-xs">{node.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function NodeSettingsForm() {
  const { editor, updateNode } = useEditor();
  const node = editor.selectedNode;
  if (!node) return null;

  const { title, metadata } = node.data;
  const meta = (metadata || {}) as Record<string, string>;

  const handleChange = (key: string, value: string) => {
    updateNode(node.id, { metadata: { ...meta, [key]: value } });
  };

  const field = (key: string, label: string, placeholder: string, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-8 text-xs"
        type={type}
        placeholder={placeholder}
        value={meta[key] || ""}
        onChange={(e) => handleChange(key, e.target.value)}
      />
    </div>
  );

  // --- Triggers ---

  if (title === "Webhook") {
    return (
      <div className="space-y-3">
        {field("webhookUrl", "Webhook URL", "https://...")}
        {field("secret", "Secret", "(optional)")}
      </div>
    );
  }

  if (title === "Schedule") {
    return <div className="space-y-3">{field("cron", "Cron Expression", "*/5 * * * *")}</div>;
  }

  if (title === "Listen Commits") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        {field("branch", "Branch", "main")}
      </div>
    );
  }

  if (title === "Listen Pull Requests") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        {field("events", "Events", "opened, closed, merged")}
      </div>
    );
  }

  if (title === "Listen Issues") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        {field("events", "Events", "opened, closed, labeled")}
      </div>
    );
  }

  if (title === "Listen Comments") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        {field("filter", "Filter", "TODO, needs-review")}
        <p className="text-[10px] text-muted-foreground">Leave blank to trigger on all comments.</p>
      </div>
    );
  }

  if (title === "Listen Releases") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
      </div>
    );
  }

  // --- Actions ---

  if (title === "Create Issue") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        {field("title", "Issue Title", "New issue from workflow")}
        {field("body", "Body", "Description...")}
        <div className="space-y-1.5">
          <Label className="text-xs">Labels</Label>
          <GitHubLabelsSelect
            value={meta.labels || ""}
            onChange={(v) => handleChange("labels", v)}
            repo={meta.repo || ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Assignees</Label>
          <GitHubAssigneesSelect
            value={meta.assignees || ""}
            onChange={(v) => handleChange("assignees", v)}
            repo={meta.repo || ""}
          />
        </div>
      </div>
    );
  }

  if (title === "Add Comment") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Issue or Pull Request</Label>
          <GitHubIssueSelect
            value={meta.issueNumber || ""}
            onChange={(v) => handleChange("issueNumber", v)}
            repo={meta.repo || ""}
          />
        </div>
        {field("body", "Comment", "Thanks for the feedback!")}
      </div>
    );
  }

  if (title === "Add Label") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Issue or Pull Request</Label>
          <GitHubIssueSelect
            value={meta.issueNumber || ""}
            onChange={(v) => handleChange("issueNumber", v)}
            repo={meta.repo || ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Label</Label>
          <GitHubLabelsSelect
            value={meta.label || ""}
            onChange={(v) => handleChange("label", v)}
            repo={meta.repo || ""}
            multi={false}
          />
        </div>
      </div>
    );
  }

  if (title === "Request Review") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Repository</Label>
          <GitHubRepoSelect value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pull Request</Label>
          <GitHubIssueSelect
            value={meta.prNumber || ""}
            onChange={(v) => handleChange("prNumber", v)}
            repo={meta.repo || ""}
            type="pulls"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Reviewers</Label>
          <GitHubAssigneesSelect
            value={meta.reviewers || ""}
            onChange={(v) => handleChange("reviewers", v)}
            repo={meta.repo || ""}
          />
        </div>
      </div>
    );
  }

  if (title === "HTTP Request") {
    return (
      <div className="space-y-3">
        {field("url", "URL", "https://...")}
        <div className="space-y-1.5">
          <Label className="text-xs">Method</Label>
          <select
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={meta.method || "GET"}
            onChange={(e) => handleChange("method", e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Headers (JSON)</Label>
          <Textarea
            className="min-h-[80px] text-xs font-mono"
            placeholder='{"Authorization": "Bearer ..."}'
            value={meta.headers || ""}
            onChange={(e) => handleChange("headers", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Body (JSON)</Label>
          <Textarea
            className="min-h-[80px] text-xs font-mono"
            placeholder='{"key": "value"}'
            value={meta.body || ""}
            onChange={(e) => handleChange("body", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (title === "Transform Data") {
    return (
      <div className="space-y-3">
        {field("expression", "Expression", "item => item.previousStep.output.temperature")}
        <p className="text-[10px] text-muted-foreground">
          Receives the ancestor chain as{" "}
          <code className="bg-muted px-1 rounded">item</code>.
          Use{" "}
          <code className="bg-muted px-1 rounded">item.previousStep.output</code>{" "}
          to access the parent node&apos;s output. Chain deeper with{" "}
          <code className="bg-muted px-1 rounded">item.previousStep.previousStep.output</code>.
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs">Sample Input (JSON, for standalone test)</Label>
          <Textarea
            className="min-h-[60px] text-xs font-mono"
            placeholder='{"previousStep": {"output": {"temperature": 28.3}}}'
            value={meta.body || ""}
            onChange={(e) => handleChange("body", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (title === "Conditional") {
    return (
      <div className="space-y-3">
        {field("expression", "Condition", "item.previousStep.output.status >= 400")}
        <p className="text-[10px] text-muted-foreground">
          Returns <code className="bg-muted px-1 rounded">true</code> or{" "}
          <code className="bg-muted px-1 rounded">false</code>.
          Connect the <span className="text-green-500 font-medium">green handle</span> for success
          and the <span className="text-red-500 font-medium">red handle</span> for failure.
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs">Sample Input (JSON, for standalone test)</Label>
          <Textarea
            className="min-h-[60px] text-xs font-mono"
            placeholder='{"previousStep": {"output": {"status": 200}}}'
            value={meta.body || ""}
            onChange={(e) => handleChange("body", e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">No configuration available for this node type.</p>
  );
}

export function EditorCanvasSidebar() {
  const { editor, sidebarTab, setSidebarTab } = useEditor();
  const hasNodes = editor.elements.length > 0;

  const availableTriggerNodes = hasNodes ? [] : triggerNodes;
  const availableActionNodes = actionNodes;

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b">
        <button
          onClick={() => setSidebarTab("actions")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            sidebarTab === "actions"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Actions
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => setSidebarTab("settings")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            sidebarTab === "settings"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          Settings
        </button>
      </div>
      {sidebarTab === "actions" && (
        <div className="p-2 space-y-2 flex-1 overflow-auto">
          {!hasNodes && availableTriggerNodes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Triggers
              </p>
              {availableTriggerNodes.map((node) => (
                <DraggableCard key={node.title} node={node} />
              ))}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {hasNodes ? "Available Actions" : "Actions"}
            </p>
            {availableActionNodes.map((node) => (
              <DraggableCard key={node.title} node={node} />
            ))}
          </div>
        </div>
      )}
      {sidebarTab === "settings" && (
        <div className="p-2 flex-1 overflow-auto">
          {editor.selectedNode ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium">{editor.selectedNode.data.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {editor.selectedNode.data.description}
                </p>
              </div>
              <NodeSettingsForm />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Click a node on the canvas to configure it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
