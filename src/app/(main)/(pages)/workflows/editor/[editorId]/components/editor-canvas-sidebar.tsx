"use client";

import React, { useEffect, useState } from "react";
import { GitBranch, Zap, Settings, GripVertical, GitFork, Database, Sparkles, ArrowRightLeft, LogIn, LogOut, History, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditor } from "@/providers/editor-provider";
import { ExecutionHistory } from "./execution-history";
import type { EditorNodeData, Connection } from "@/lib/types";
import { SETTINGS_REGISTRY } from "./node-settings";

interface NodeCardDef {
  type: EditorNodeData["type"];
  title: string;
  description: string;
  requiresConnection?: Connection["type"];
}

const triggerNodes: NodeCardDef[] = [
  { type: "Trigger", title: "Webhook", description: "Trigger on incoming webhook event", requiresConnection: "Webhook" },
  { type: "Trigger", title: "Schedule", description: "Trigger on a cron schedule" },
  { type: "Trigger", title: "Input", description: "Receive data from parent workflow (sub-workflows only)" },
  { type: "GitHub", title: "Listen Commits", description: "Trigger on new pushes to a repo", requiresConnection: "GitHub" },
  {
    type: "GitHub",
    title: "Listen Pull Requests",
    description: "Trigger on PR events (open, close, merge)",
    requiresConnection: "GitHub",
  },
  {
    type: "GitHub",
    title: "Listen Issues",
    description: "Trigger on issue events (open, close, label)",
    requiresConnection: "GitHub",
  },
  { type: "GitHub", title: "Listen Comments", description: "Trigger on comments on issues or PRs", requiresConnection: "GitHub" },
  { type: "GitHub", title: "Listen Releases", description: "Trigger when a release is published", requiresConnection: "GitHub" },
];

const actionNodes: NodeCardDef[] = [
  {
    type: "GitHub",
    title: "Create Issue",
    description: "Create a new issue with labels and assignees",
    requiresConnection: "GitHub",
  },
  { type: "GitHub", title: "Add Comment", description: "Post a comment on an issue or PR", requiresConnection: "GitHub" },
  { type: "GitHub", title: "Add Label", description: "Add a label to an issue or PR", requiresConnection: "GitHub" },
  { type: "GitHub", title: "Request Review", description: "Request a review on a pull request", requiresConnection: "GitHub" },
  { type: "Action", title: "HTTP Request", description: "Make an HTTP request to an API" },
  { type: "Action", title: "Transform Data", description: "Map, filter, or transform data" },
  { type: "Action", title: "Build JSON", description: "Build a JSON object from fields" },
  { type: "Action", title: "Conditional", description: "Branch based on a condition (success/failure paths)" },
  { type: "Action", title: "Retry Loop", description: "HTTP request with retry until condition met" },
  { type: "Action", title: "Call Workflow", description: "Call a reusable sub-workflow" },
  { type: "Action", title: "Return", description: "Export values back to parent workflow (sub-workflows only)" },
  { type: "PostgreSQL", title: "PostgreSQL Query", description: "Execute a SELECT query", requiresConnection: "PostgreSQL" },
  { type: "PostgreSQL", title: "PostgreSQL Insert", description: "Insert a row into a table", requiresConnection: "PostgreSQL" },
  { type: "PostgreSQL", title: "PostgreSQL Update", description: "Update rows in a table", requiresConnection: "PostgreSQL" },
  { type: "PostgreSQL", title: "PostgreSQL Delete", description: "Delete rows from a table", requiresConnection: "PostgreSQL" },
  { type: "AI", title: "Prompt", description: "Send a prompt to AI and get a response", requiresConnection: "AI" },
  { type: "AI", title: "Classify", description: "Classify text into categories using AI", requiresConnection: "AI" },
  { type: "AI", title: "Extract", description: "Extract structured data from text using AI", requiresConnection: "AI" },
  { type: "SMTP", title: "Send Email", description: "Send an email via SMTP", requiresConnection: "SMTP" },
  { type: "Slack", title: "Send Slack Message", description: "Post a message to a Slack channel", requiresConnection: "Slack" },
];

const iconMap: Record<string, React.ReactNode> = {
  Trigger: <Zap className="h-3 w-3 text-yellow-500" />,
  Action: <Settings className="h-3 w-3 text-blue-500" />,
  GitHub: <GitBranch className="h-3 w-3 text-foreground" />,
  Conditional: <GitFork className="h-3 w-3 text-orange-500" />,
  PostgreSQL: <Database className="h-3 w-3 text-blue-600" />,
  AI: <Sparkles className="h-3 w-3 text-purple-500" />,
  "Call Workflow": <ArrowRightLeft className="h-3 w-3 text-emerald-500" />,
  Input: <LogIn className="h-3 w-3 text-cyan-500" />,
  Return: <LogOut className="h-3 w-3 text-amber-500" />,
  SMTP: <Mail className="h-3 w-3 text-red-500" />,
  Slack: <MessageSquare className="h-3 w-3 text-purple-500" />,
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
                {iconMap[node.title] || iconMap[node.type]}
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
  const { editor, updateNode, markDirty } = useEditor();
  const node = editor.selectedNode;
  if (!node) return null;

  const { title, metadata } = node.data;
  const meta = (metadata || {}) as Record<string, string>;
  const parentEdge = editor.edges.find((e) => e.target === node.id);
  const parentOutput = parentEdge ? (editor.context[parentEdge.source]?.output ?? null) : null;

  const handleChange = (key: string, value: string) => {
    updateNode(node.id, { metadata: { ...meta, [key]: value } });
    markDirty();
  };

  const SettingsComponent = SETTINGS_REGISTRY[title];
  if (SettingsComponent) {
    return <SettingsComponent meta={meta} handleChange={handleChange} parentOutput={parentOutput} hasParentEdge={!!parentEdge} />;
  }

  return <p className="text-xs text-muted-foreground">No configuration available for this node type.</p>;
}

export function EditorCanvasSidebar({ workflowId }: { workflowId?: string }) {
  const { editor, sidebarTab, setSidebarTab } = useEditor();
  const hasNodes = editor.elements.length > 0;
  const [configuredTypes, setConfiguredTypes] = useState<Set<Connection["type"]>>(new Set());

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((conns: Connection[]) => {
        const types = new Set(conns.map((c) => c.type));
        setConfiguredTypes(types);
      })
      .catch(() => {});
  }, []);

  const isAvailable = (node: NodeCardDef) =>
    !node.requiresConnection || configuredTypes.has(node.requiresConnection);

  const availableTriggerNodes = hasNodes ? [] : triggerNodes.filter(isAvailable);
  const availableActionNodes = actionNodes.filter(isAvailable);

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b">
        <button
          onClick={() => setSidebarTab("actions")}
          className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
            sidebarTab === "actions"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Settings className="h-3 w-3" />
          Actions
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => setSidebarTab("settings")}
          className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
            sidebarTab === "settings"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Settings className="h-3 w-3" />
          Settings
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => setSidebarTab("history")}
          className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
            sidebarTab === "history"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <History className="h-3 w-3" />
          History
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
      {sidebarTab === "history" && workflowId && (
        <ExecutionHistory workflowId={workflowId} />
      )}
    </div>
  );
}
