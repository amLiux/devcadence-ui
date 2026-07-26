"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";

export function HttpRequestSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> to reference data from previous steps. E.g. <code className="bg-muted px-1 rounded">{"{{previousStep.id}}"}</code> or <code className="bg-muted px-1 rounded">{"{{step1.token}}"}</code>.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">URL</Label>
        <Input className="h-8 text-xs font-mono" placeholder="https://api.example.com/{{previousStep.id}}" value={meta.url || ""} onChange={(e) => handleChange("url", e.target.value)} />
      </div>
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
        <Textarea className="min-h-[80px] text-xs font-mono" placeholder='{"Authorization": "Bearer {{previousStep.token}}"}' value={meta.headers || ""} onChange={(e) => handleChange("headers", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body (JSON)</Label>
        <Textarea className="min-h-[80px] text-xs font-mono" placeholder='{"key": "{{previousStep.value}}"}' value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
      </div>
    </div>
  );
}
