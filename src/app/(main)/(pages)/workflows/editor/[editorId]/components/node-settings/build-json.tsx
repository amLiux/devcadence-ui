"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { NodeSettingsProps } from "./types";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";

function countFields(meta: Record<string, string>): number {
  let count = 0;
  for (const key of Object.keys(meta)) {
    if (key.startsWith("mapKey_")) {
      const idx = parseInt(key.replace("mapKey_", ""), 10);
      if (idx > count) count = idx;
    }
  }
  return count || 1;
}

export function BuildJsonSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const fieldCount = countFields(meta);
  const fields = Array.from({ length: fieldCount }, (_, i) => i + 1);

  const addField = () => {
    handleChange(`mapKey_${fieldCount + 1}`, "");
  };

  const removeField = (index: number) => {
    for (let i = index; i < fieldCount; i++) {
      const nextKey = meta[`mapKey_${i + 1}`] || "";
      const nextValue = meta[`mapValue_${i + 1}`] || "";
      handleChange(`mapKey_${i}`, nextKey);
      handleChange(`mapValue_${i}`, nextValue);
    }
    handleChange(`mapKey_${fieldCount}`, "");
    handleChange(`mapValue_${fieldCount}`, "");
  };

  return (
    <div className="space-y-3">
      {hasParentEdge
        ? <InheritedDataPanel output={parentOutput} />
        : <InheritedDataPanelDisabled />
      }

      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-[10px] text-muted-foreground">
          Build a JSON object by mapping each property name to a value expression.
          Use <code className="text-primary">previousStep.field</code> to reference parent output.
        </p>
      </div>

      {fields.map((idx) => (
        <div key={idx} className="space-y-1.5 rounded-md border p-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Property {idx}</Label>
            {fieldCount > 1 && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeField(idx)}
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Key</Label>
              <Input
                className="h-8 text-xs"
                value={meta[`mapKey_${idx}`] || ""}
                onChange={(e) => handleChange(`mapKey_${idx}`, e.target.value)}
                placeholder="e.g., latitude"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Value (expression)</Label>
              <Input
                className="h-8 text-xs font-mono"
                value={meta[`mapValue_${idx}`] || ""}
                onChange={(e) => handleChange(`mapValue_${idx}`, e.target.value)}
                placeholder="e.g., previousStep.coordinates.latitude"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="xs"
        onClick={addField}
        className="w-full"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Property
      </Button>

      <div className="space-y-1.5">
        <Label className="text-xs">Output Name (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="e.g., coords"
          value={meta.outputName || ""}
          onChange={(e) => handleChange("outputName", e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          Name this output to reference it directly via <code className="text-primary">{"{{outputName.field}}"}</code>
        </p>
      </div>
    </div>
  );
}
