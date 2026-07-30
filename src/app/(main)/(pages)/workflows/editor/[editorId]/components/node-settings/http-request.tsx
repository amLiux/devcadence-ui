"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonEditor, formatJson } from "@/components/ui/json-editor";
import { AlignLeft } from "lucide-react";
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
        <div className="flex items-center justify-between">
          <Label className="text-xs">Headers (JSON)</Label>
          {meta.headers && (
            <button
              type="button"
              onClick={() => handleChange("headers", formatJson(meta.headers))}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <AlignLeft className="h-3 w-3" />
              Format
            </button>
          )}
        </div>
        <JsonEditor
          value={meta.headers || ""}
          onChange={(v) => handleChange("headers", v)}
          placeholder='{"Authorization": "Bearer {{previousStep.token}}"}'
          minHeight={80}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Body (JSON)</Label>
          {meta.body && (
            <button
              type="button"
              onClick={() => handleChange("body", formatJson(meta.body))}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <AlignLeft className="h-3 w-3" />
              Format
            </button>
          )}
        </div>
        <JsonEditor
          value={meta.body || ""}
          onChange={(v) => handleChange("body", v)}
          placeholder='{"key": "{{previousStep.value}}"}'
          minHeight={80}
        />
      </div>
    </div>
  );
}
