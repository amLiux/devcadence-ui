"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GitBranch, Webhook, Clock, Hand, Play, Trash2, Repeat, FileEdit, Pause, MessageCircle, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DebugModal } from "@/components/composed/debug-modal";
import { inferTriggerType, TRIGGER_TYPE_LABELS, type WorkflowTriggerType } from "@/lib/types";
import type { Workflow, NodeDebugLog, LogEntry } from "@/lib/types";

const triggerIcons: Record<WorkflowTriggerType, React.ReactNode> = {
  webhook: <Webhook className="h-5 w-5" />,
  schedule: <Clock className="h-5 w-5" />,
  github: <GitBranch className="h-5 w-5" />,
  discord: <MessageCircle className="h-5 w-5" />,
  "sub-workflow": <Repeat className="h-5 w-5" />,
  manual: <Hand className="h-5 w-5" />,
};

const triggerColors: Record<WorkflowTriggerType, string> = {
  webhook: "text-blue-500",
  schedule: "text-yellow-500",
  github: "text-foreground",
  discord: "text-indigo-500",
  "sub-workflow": "text-purple-500",
  manual: "text-muted-foreground",
};

interface Props {
  workflow: Workflow;
  onDelete: (id: string) => void;
  onUpdate?: (workflow: Workflow) => void;
}

export function WorkflowCard({ workflow, onDelete, onUpdate }: Props) {
  const triggerType = inferTriggerType(workflow.nodes, workflow.type);
  const [testing, setTesting] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSteps, setDebugSteps] = useState<NodeDebugLog[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(workflow.name);
  const [editDescription, setEditDescription] = useState(workflow.description);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditName(workflow.name);
    setEditDescription(workflow.description);
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editName.trim();
    if (!name) {
      setEditError("Name is required");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: editDescription.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update workflow");
      }
      onUpdate?.(payload as Workflow);
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update workflow");
    } finally {
      setEditSaving(false);
    }
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTesting(true);
    setDebugSteps([]);
    setDebugOpen(true);

    try {
      const res = await fetch("/api/workflows/test-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      });

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("event-stream")) {
        const pendingEntries = new Map<string, LogEntry[]>();
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No reader");
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          buf += decoder.decode(value || new Uint8Array(), { stream: !done });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
            try {
              const msg = JSON.parse(data);
              if (msg.type === "step-start") {
                pendingEntries.set(msg.nodeId, []);
                setDebugSteps((prev) => [...prev, { nodeId: msg.nodeId, title: msg.title, success: false, logs: [] }]);
              } else if (msg.type === "log") {
                const entries = pendingEntries.get(msg.nodeId);
                if (entries) {
                  entries.push(msg.entry);
                  setDebugSteps((prev) =>
                    prev.map((s) => (s.nodeId === msg.nodeId ? { ...s, logs: [...entries] } : s)),
                  );
                }
              } else if (msg.type === "step") {
                setDebugSteps((prev) =>
                  prev.map((s) => (s.nodeId === msg.step.nodeId ? msg.step : s)),
                );
              } else if (msg.type === "result") {
                setTesting(false);
              }
            } catch { /* skip malformed */ }
          }
          if (done) break;
        }
      } else {
        const result = await res.json();
        if (result.steps) {
          setDebugSteps(result.steps);
        } else {
          setDebugSteps([
            {
              nodeId: "error",
              title: "Workflow",
              success: false,
              logs: [
                {
                  type: "error",
                  message: result.error || result.message || "Unknown error",
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          ]);
        }
        setTesting(false);
      }
    } catch {
      setDebugSteps([
        {
          nodeId: "error",
          title: "Workflow",
          success: false,
          logs: [
            {
              type: "error",
              message: "Request failed",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      ]);
      setTesting(false);
    }
  };

  return (
    <>
      <Link href={`/workflows/editor/${workflow.id}`}>
        <Card className="relative group overflow-hidden hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <span className={triggerColors[triggerType]}>{triggerIcons[triggerType]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{workflow.name}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge
                  variant={workflow.status === "active" ? "default" : workflow.status === "paused" ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 gap-0.5"
                >
                  {workflow.status === "active" ? <Play className="h-3 w-3" /> : workflow.status === "paused" ? <Pause className="h-3 w-3" /> : <FileEdit className="h-3 w-3" />}
                  {workflow.status === "active" ? "Active" : workflow.status === "paused" ? "Paused" : "Draft"}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {TRIGGER_TYPE_LABELS[triggerType]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 px-0"
                aria-label={`Edit ${workflow.name}`}
                onClick={handleOpenEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 h-7 w-7 px-0"
                disabled={testing}
                onClick={handleTest}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 px-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(workflow.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {workflow.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {workflow.description}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit workflow</DialogTitle>
              <DialogDescription>
                Update the name and description shown in the workflow list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="workflow-edit-name">Name</Label>
              <Input
                id="workflow-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Workflow name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workflow-edit-description">Description</Label>
              <Textarea
                id="workflow-edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What does this workflow do?"
                className="min-h-20"
              />
            </div>
            {editError && (
              <p role="alert" className="text-xs text-destructive">
                {editError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DebugModal
        open={debugOpen}
        onOpenChange={setDebugOpen}
        title={`Test: ${workflow.name}`}
        steps={debugSteps}
        running={testing}
      />
    </>
  );
}
