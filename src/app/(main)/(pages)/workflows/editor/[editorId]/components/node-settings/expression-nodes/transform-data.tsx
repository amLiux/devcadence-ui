"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonField } from "@/components/composed/json-field";
import type { NodeSettingsProps } from "../types";
import { InheritedDataPanel } from "./inherited-data-panel";
import { InheritedDataPanelDisabled } from "./inherited-data-panel-disabled";

export function TransformDataSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const [examplesOpen, setExamplesOpen] = useState(false);

  return (
    <div className="space-y-3">
      {hasParentEdge &&
        (parentOutput ? (
          <InheritedDataPanel output={parentOutput} />
        ) : (
          <InheritedDataPanelDisabled />
        ))}
      <div className="space-y-1.5">
        <Label className="text-xs">Expression</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="previousStep.rows.map(r => r.name)"
          value={meta.expression || ""}
          onChange={(event) => handleChange("expression", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">previousStep</code> to access the parent
        node&apos;s output. Chain deeper with{" "}
        <code className="bg-muted px-1 rounded">previousStep.previousStep</code>. Any valid
        JavaScript expression works.
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
            <code>{"previousStep.rows.map(r => ({ id: r.id, name: r.name }))"}</code>
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
            <code>{"previousStep.rows.reduce((sum, r) => sum + r.quantity, 0)"}</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Ternary / conditional:</p>
            <code>{"previousStep.rowCount > 0 ? previousStep.rows[0] : null"}</code>
          </div>
          <div>
            <p className="text-muted-foreground font-sans mb-0.5">Chain parent nodes:</p>
            <code>previousStep.previousStep.rows[0].name</code>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Output Name (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="myOutput"
          value={meta.outputName || ""}
          onChange={(event) => handleChange("outputName", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Name this output to reference it directly in downstream nodes. If you name it{" "}
        <code className="bg-muted px-1 rounded">step1</code>, downstream nodes can use{" "}
        <code className="bg-muted px-1 rounded">step1.field</code> instead of chaining{" "}
        <code className="bg-muted px-1 rounded">previousStep.previousStep.field</code>.
      </p>
      <JsonField
        label="Sample Input (JSON, for standalone test)"
        value={meta.body || ""}
        onChange={(value) => handleChange("body", value)}
        placeholder='{"rows": [{"id": 1, "name": "test"}], "rowCount": 1}'
        minHeight={60}
      />
    </div>
  );
}
