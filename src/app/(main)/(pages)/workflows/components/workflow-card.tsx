"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GitBranch, Webhook, Clock, Hand, Play, Trash2, Repeat, FileEdit, Pause, MessageCircle, Pencil, Folder, FolderInput } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DebugModal } from "@/components/composed/debug-modal";
import { CustomModal } from "@/components/composed/custom-modal";
import { WorkflowForm, type WorkflowFormValues } from "@/components/forms/workflow-form";
import { useModal } from "@/providers/modal-provider";
import { inferTriggerType, TRIGGER_TYPE_LABELS, type WorkflowTriggerType } from "@/lib/types";
import type { Workflow, NodeDebugLog, LogEntry, Project } from "@/lib/types";

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
  projects: Project[];
  projectName?: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: WorkflowFormValues) => Promise<void>;
  onMove: (id: string, projectId: string) => Promise<void>;
}

export function MoveWorkflowForm({
  workflow,
  projects,
  onMove,
}: {
  workflow: Workflow;
  projects: Project[];
  onMove: (id: string, projectId: string) => Promise<void>;
}) {
  const { setClose } = useModal();
  const [projectId, setProjectId] = useState(workflow.projectId);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMove = async () => {
    setMoving(true);
    setError(null);
    try {
      await onMove(workflow.id, projectId);
      setClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the workflow.");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="move-project">Project</Label>
        <select
          id="move-project"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          onClick={handleMove}
          disabled={moving || projectId === workflow.projectId}
        >
          {moving ? "Moving..." : "Move"}
        </Button>
      </div>
    </div>
  );
}

export function WorkflowCard({ workflow, projects, projectName, onDelete, onUpdate, onMove }: Props) {
  const triggerType = inferTriggerType(workflow.nodes, workflow.type);
  const { setOpen } = useModal();
  const [testing, setTesting] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSteps, setDebugSteps] = useState<NodeDebugLog[]>([]);

  const handleOpenEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(
      <CustomModal title="Edit Workflow" subheading={`Update ${workflow.name}`}>
        <WorkflowForm initialData={workflow} onUpdate={onUpdate} />
      </CustomModal>,
    );
  };

  const handleOpenMove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(
      <CustomModal title="Move Workflow" subheading={workflow.name}>
        <MoveWorkflowForm workflow={workflow} projects={projects} onMove={onMove} />
      </CustomModal>,
    );
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
                {projectName && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <Folder className="h-3 w-3" />
                    {projectName}
                  </Badge>
                )}
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
                className="h-7 w-7 px-0"
                aria-label={`Move ${workflow.name}`}
                onClick={handleOpenMove}
              >
                <FolderInput className="h-3.5 w-3.5" />
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
