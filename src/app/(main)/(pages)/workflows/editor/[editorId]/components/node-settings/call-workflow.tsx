"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeSettingsProps } from "./types";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";

interface SubWorkflow {
  id: string;
  name: string;
  description: string;
}

export function CallWorkflowSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const [workflows, setWorkflows] = useState<SubWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflows?type=sub-workflow")
      .then((res) => res.json())
      .then((data) => {
        setWorkflows(data.workflows || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
          onValueChange={(val) => handleChange("workflowId", val ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? "Loading..." : "Select workflow"}>
              {(value) => workflows.find((wf) => wf.id === value)?.name || value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {workflows.map((wf) => (
              <SelectItem key={wf.id} value={wf.id}>
                {wf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {workflows.length === 0 && !loading && (
          <p className="text-[10px] text-muted-foreground">
            No reusable workflows found. Mark a workflow as &quot;Reusable&quot; to use it here.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Input (JSON)</Label>
        <Textarea
          className="min-h-[80px] text-xs font-mono"
          value={meta.input || "{}"}
          onChange={(e) => handleChange("input", e.target.value)}
          placeholder={'{"key": "value"}'}
        />
        <p className="text-[10px] text-muted-foreground">
          Values passed to the target workflow&apos;s Input node as {'{{input.*}}'}
        </p>
      </div>

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
