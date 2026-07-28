"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { NodeSettingsProps } from "./types";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";

function countFields(meta: Record<string, string>): number {
  let count = 0;
  for (const key of Object.keys(meta)) {
    if (key.startsWith("return_name_")) {
      const idx = parseInt(key.replace("return_name_", ""), 10);
      if (idx > count) count = idx;
    }
  }
  return count || 1;
}

export function ReturnSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const fieldCount = countFields(meta);
  const fields = Array.from({ length: fieldCount }, (_, i) => i + 1);

  const addField = () => {
    handleChange(`return_name_${fieldCount + 1}`, "");
  };

  const removeField = (index: number) => {
    for (let i = index; i < fieldCount; i++) {
      const nextName = meta[`return_name_${i + 1}`] || "";
      const nextValue = meta[`return_value_${i + 1}`] || "";
      handleChange(`return_name_${i}`, nextName);
      handleChange(`return_value_${i}`, nextValue);
    }
    handleChange(`return_name_${fieldCount}`, "");
    handleChange(`return_value_${fieldCount}`, "");
  };

  return (
    <div className="space-y-3">
      {hasParentEdge
        ? <InheritedDataPanel output={parentOutput} />
        : <InheritedDataPanelDisabled />
      }

      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-[10px] text-muted-foreground">
          Export values back to the parent workflow. Access via{" "}
          <code className="text-primary">{"{{callWorkflow.<name>}}"}</code>
        </p>
      </div>

      {fields.map((idx) => (
        <div key={idx} className="space-y-1.5 rounded-md border p-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Return {idx}</Label>
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
          <Input
            className="h-8 text-xs"
            value={meta[`return_name_${idx}`] || ""}
            onChange={(e) => handleChange(`return_name_${idx}`, e.target.value)}
            placeholder="e.g., token, result"
          />
          <p className="text-[10px] text-muted-foreground">
            Name — becomes {`{{callWorkflow.${meta[`return_name_${idx}`] || "..."}}}`}
          </p>
          <Textarea
            className="min-h-[60px] text-xs font-mono"
            value={meta[`return_value_${idx}`] || ""}
            onChange={(e) => handleChange(`return_value_${idx}`, e.target.value)}
            placeholder="{{http.response.access_token}}"
          />
        </div>
      ))}

      <Button
        variant="outline"
        size="xs"
        onClick={addField}
        className="w-full"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Return Value
      </Button>
    </div>
  );
}
