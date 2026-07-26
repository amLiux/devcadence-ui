"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NodeSettingsProps } from "./types";

export function InheritedDataPanel({ output }: { output: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/50"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Inherited Data
      </button>
      {open && (
        <div className="px-3 pb-3">
          {output ? (
            <pre className="max-h-[120px] overflow-auto text-[10px] font-mono bg-muted p-2 rounded">
              {JSON.stringify(output, null, 2)}
            </pre>
          ) : (
            <p className="text-[10px] text-muted-foreground">No data available</p>
          )}
        </div>
      )}
    </div>
  );
}

export function InheritedDataPanelDisabled() {
  return (
    <div className="border rounded-md opacity-50">
      <div className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium">
        <ChevronRight className="h-3 w-3" />
        Inherited Data
        <Tooltip>
          <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground ml-auto" />}>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Run this node&apos;s parent node to see available data</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function TransformDataSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const [examplesOpen, setExamplesOpen] = useState(false);

  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Expression</Label>
        <Input className="h-8 text-xs font-mono" placeholder="previousStep.rows.map(r => r.name)" value={meta.expression || ""} onChange={(e) => handleChange("expression", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">previousStep</code> to access the parent node&apos;s output. Chain deeper with <code className="bg-muted px-1 rounded">previousStep.previousStep</code>. Any valid JavaScript expression works.
      </p>

      <button
        type="button"
        onClick={() => setExamplesOpen(!examplesOpen)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {examplesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Examples
      </button>

      {examplesOpen && (
        <div className="space-y-2 text-[10px] font-mono bg-muted/50 rounded-md p-2">
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Map rows to specific fields:</p>
            <code>{'previousStep.rows.map(r => ({ id: r.id, name: r.name }))'}</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Filter rows:</p>
            <code>{'previousStep.rows.filter(r => r.type === "GitHub")'}</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Get first item:</p>
            <code>previousStep.rows[0]</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Count results:</p>
            <code>previousStep.rowCount</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Extract a single field:</p>
            <code>previousStep.rows.map(r =&gt; r.name)</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Sum a numeric field:</p>
            <code>{'previousStep.rows.reduce((sum, r) => sum + r.quantity, 0)'}</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Ternary / conditional:</p>
            <code>{'previousStep.rowCount > 0 ? previousStep.rows[0] : null'}</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Chain parent nodes:</p>
            <code>previousStep.previousStep.rows[0].name</code>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Output Name (optional)</Label>
        <Input className="h-8 text-xs" placeholder="myOutput" value={meta.outputName || ""} onChange={(e) => handleChange("outputName", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Name this output to reference it directly in downstream nodes. If you name it <code className="bg-muted px-1 rounded">step1</code>, downstream nodes can use <code className="bg-muted px-1 rounded">step1.field</code> instead of chaining <code className="bg-muted px-1 rounded">previousStep.previousStep.field</code>.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Sample Input (JSON, for standalone test)</Label>
        <Textarea className="min-h-[60px] text-xs font-mono" placeholder='{"rows": [{"id": 1, "name": "test"}], "rowCount": 1}' value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
      </div>
    </div>
  );
}

export function ConditionalSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Condition</Label>
        <Input className="h-8 text-xs" placeholder="previousStep.status >= 400" value={meta.expression || ""} onChange={(e) => handleChange("expression", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Returns <code className="bg-muted px-1 rounded">true</code> or <code className="bg-muted px-1 rounded">false</code>.
        Connect the <span className="text-green-500 font-medium">green handle</span> for success
        and the <span className="text-red-500 font-medium">red handle</span> for failure.
        Use <code className="bg-muted px-1 rounded">previousStep.status</code> to access HTTP status.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Sample Input (JSON, for standalone test)</Label>
        <Textarea className="min-h-[60px] text-xs font-mono" placeholder='{"status": 200, "body": {...}}' value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
      </div>
    </div>
  );
}

// Need Input import for shared field usage
import { Input } from "@/components/ui/input";
