"use client";

import Link from "next/link";
import { FileEdit, Folder, FolderInput, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DebugModal } from "@/components/composed/debug-modal";
import { CustomModal } from "@/components/composed/custom-modal";
import { WorkflowForm, type WorkflowFormValues } from "@/components/forms/workflow-form";
import { useModal } from "@/providers/modal-provider";
import { inferTriggerType, TRIGGER_TYPE_LABELS } from "@/lib/types";
import type { Project, Workflow } from "@/lib/types";
import { MoveWorkflowForm } from "./move-workflow-form";
import { triggerColors, triggerIcons } from "./trigger-meta";
import { useWorkflowTest } from "./use-workflow-test";

interface Props {
  workflow: Workflow;
  projects: Project[];
  projectName?: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: WorkflowFormValues) => Promise<void>;
  onMove: (id: string, projectId: string) => Promise<void>;
}

export function WorkflowCard({
  workflow,
  projects,
  projectName,
  onDelete,
  onUpdate,
  onMove,
}: Props) {
  const triggerType = inferTriggerType(workflow.nodes, workflow.type);
  const { setOpen } = useModal();
  const { testing, debugOpen, setDebugOpen, debugSteps, test } = useWorkflowTest(workflow);

  const handleOpenEdit = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(
      <CustomModal title="Edit Workflow" subheading={`Update ${workflow.name}`}>
        <WorkflowForm initialData={workflow} onUpdate={onUpdate} />
      </CustomModal>,
    );
  };

  const handleOpenMove = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(
      <CustomModal title="Move Workflow" subheading={workflow.name}>
        <MoveWorkflowForm workflow={workflow} projects={projects} onMove={onMove} />
      </CustomModal>,
    );
  };

  const statusIcon =
    workflow.status === "active" ? (
      <Play className="h-3 w-3" />
    ) : workflow.status === "paused" ? (
      <Pause className="h-3 w-3" />
    ) : (
      <FileEdit className="h-3 w-3" />
    );

  const statusLabel =
    workflow.status === "active" ? "Active" : workflow.status === "paused" ? "Paused" : "Draft";

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
                  variant={
                    workflow.status === "active"
                      ? "default"
                      : workflow.status === "paused"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-[10px] px-1.5 py-0 gap-0.5"
                >
                  {statusIcon}
                  {statusLabel}
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
                onClick={test}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 px-0"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete(workflow.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {workflow.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{workflow.description}</p>
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
