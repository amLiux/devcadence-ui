"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JsonField } from "@/components/composed/json-field";
import { NodeSettingsProps } from "./types";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import { groupReusableWorkflows } from "@/lib/workflows/projects";
import type { Project } from "@/lib/types";

interface SubWorkflow {
  id: string;
  name: string;
  projectId: string;
}

export function CallWorkflowSettings({
  meta,
  handleChange,
  updateMeta,
  parentOutput,
  hasParentEdge,
  currentProjectId,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const [workflows, setWorkflows] = useState<SubWorkflow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workflows?type=sub-workflow&compact=1").then((res) => res.json()),
      fetch("/api/projects").then((res) => res.json()),
    ])
      .then(([workflowData, projectData]) => {
        setWorkflows(workflowData.workflows || []);
        setProjects(projectData.projects || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Only the current project and Shared can be called from here.
  const groups = groupReusableWorkflows(workflows, projects, currentProjectId);

  return (
    <div className="space-y-3">
      {hasParentEdge
        ? <InheritedDataPanel output={parentOutput} />
        : <InheritedDataPanelDisabled />
      }

      <div className="space-y-1.5">
        <Label className="text-xs">Target Workflow</Label>
        <Select
          value={meta.workflowId || ""}
          onValueChange={(val) => {
            const workflowId = val ?? "";
            // Persist the display name alongside the id so the node card can show
            // it without an extra fetch. One patch, so it cannot race with itself.
            const workflowName = workflows.find((wf) => wf.id === workflowId)?.name ?? "";
            if (updateMeta) {
              updateMeta({ workflowId, workflowName });
            } else {
              handleChange("workflowId", workflowId);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? "Loading..." : "Select workflow"}>
              {(value) => workflows.find((wf) => wf.id === value)?.name || value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.project.id}>
                <SelectLabel>{group.project.name}</SelectLabel>
                {group.workflows.map((wf) => (
                  <SelectItem key={wf.id} value={wf.id}>
                    {wf.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {groups.length === 0 && !loading && (
          <p className="text-[10px] text-muted-foreground">
            No reusable workflows found. Mark a workflow as &quot;Reusable&quot; to use it here.
          </p>
        )}
      </div>

      <JsonField
        label="Input (JSON)"
        value={meta.input || "{}"}
        onChange={(v) => handleChange("input", v)}
        placeholder={'{"key": "value"}'}
        minHeight={80}
        hint={<>Values passed to the target workflow&apos;s Input node as {"{{input.*}}"}</>}
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Output Name (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="myWorkflow"
          value={meta.outputName || ""}
          onChange={(e) => handleChange("outputName", e.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Name this output to reference it directly in downstream nodes. If you name it{' '}
        <code className="bg-muted px-1 rounded">auth</code>, downstream nodes can use{' '}
        <code className="bg-muted px-1 rounded">auth.token</code> instead of{' '}
        <code className="bg-muted px-1 rounded">callWorkflow.token</code>.
      </p>

      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-[10px] text-muted-foreground">
          <strong>Output:</strong> Access return values via{' '}
          <code className="text-primary">{'{{outputName.field}}'}</code> or{' '}
          <code className="text-primary">{'{{callWorkflow.field}}'}</code>
        </p>
      </div>
    </div>
  );
}
