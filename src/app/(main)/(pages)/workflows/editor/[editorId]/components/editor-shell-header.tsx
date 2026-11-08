"use client";

import { ArrowLeft, FileEdit, Loader2, Pause, Play, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { TRIGGER_TYPE_LABELS, type Workflow, type WorkflowStatus, type WorkflowTriggerType } from "@/lib/types";

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
};

const STATUS_ICONS: Record<WorkflowStatus, React.ReactNode> = {
  draft: <FileEdit className="h-3 w-3 shrink-0" />,
  active: <Play className="h-3 w-3 shrink-0" />,
  paused: <Pause className="h-3 w-3 shrink-0" />,
};

export function EditorShellHeader({
  workflow,
  projectName,
  dirty,
  triggerType,
  statusUpdating,
  onBack,
  onReusableToggle,
  onStatusChange,
}: {
  workflow: Workflow;
  projectName?: string;
  dirty: boolean;
  triggerType: WorkflowTriggerType;
  statusUpdating: boolean;
  onBack: () => void;
  onReusableToggle: (checked: boolean) => void;
  onStatusChange: (status: WorkflowStatus) => void;
}) {
  return (
    <div className="border-b px-4 py-2 flex items-center gap-4 bg-background/50 backdrop-blur-lg z-[10]">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {projectName && (
            <>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {projectName}
              </span>
              <span className="text-xs text-muted-foreground">/</span>
            </>
          )}
          <h1 className="text-sm font-semibold">{workflow.name}</h1>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {TRIGGER_TYPE_LABELS[triggerType]}
          </Badge>
          {dirty && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
            >
              Unsaved
            </Badge>
          )}
        </div>
        {workflow.description && (
          <p className="text-xs text-muted-foreground">{workflow.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="reusable-toggle"
            className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap flex items-center gap-1"
          >
            <Repeat className="h-3 w-3" />
            Reusable
          </Label>
          <Switch
            id="reusable-toggle"
            checked={workflow.type === "sub-workflow"}
            onCheckedChange={onReusableToggle}
          />
        </div>
        <div className="w-px h-5 bg-border" />
        <Select
          value={workflow.status}
          disabled={statusUpdating}
          onValueChange={(value) => value && onStatusChange(value as WorkflowStatus)}
        >
          <SelectTrigger className="h-7 w-[100px] text-xs gap-1">
            {statusUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin mx-auto" />
            ) : (
              <>
                {STATUS_ICONS[workflow.status]}
                <span>{STATUS_LABELS[workflow.status]}</span>
              </>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft" className="text-xs">
              Draft
            </SelectItem>
            <SelectItem value="active" className="text-xs">
              Active
            </SelectItem>
            <SelectItem value="paused" className="text-xs">
              Paused
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
