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
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Expression</Label>
        <Input className="h-8 text-xs" placeholder="previousStep.temperature" value={meta.expression || ""} onChange={(e) => handleChange("expression", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">previousStep</code> to access the parent node&apos;s output. Chain deeper with <code className="bg-muted px-1 rounded">previousStep.previousStep</code>.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Output Name (optional)</Label>
        <Input className="h-8 text-xs" placeholder="modifiedTemperature" value={meta.outputName || ""} onChange={(e) => handleChange("outputName", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Name this output so downstream nodes see <code className="bg-muted px-1 rounded">{"{ name: value }"}</code> instead of a bare value.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Sample Input (JSON, for standalone test)</Label>
        <Textarea className="min-h-[60px] text-xs font-mono" placeholder='{"temperature": 28.3}' value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
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
