"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { NodeSettingsProps } from "./types";

function countFields(meta: Record<string, string>): number {
  let count = 0;
  for (const key of Object.keys(meta)) {
    if (key.startsWith("inputName_")) {
      const idx = parseInt(key.replace("inputName_", ""), 10);
      if (idx > count) count = idx;
    }
  }
  return count || 1;
}

export function InputSettings({ meta, handleChange }: NodeSettingsProps) {
  const fieldCount = countFields(meta);
  const fields = Array.from({ length: fieldCount }, (_, i) => i + 1);

  const addField = () => {
    handleChange(`inputName_${fieldCount + 1}`, "");
  };

  const removeField = (index: number) => {
    for (let i = index; i < fieldCount; i++) {
      const nextName = meta[`inputName_${i + 1}`] || "";
      const nextDefault = meta[`inputDefault_${i + 1}`] || "";
      handleChange(`inputName_${i}`, nextName);
      handleChange(`inputDefault_${i}`, nextDefault);
    }
    handleChange(`inputName_${fieldCount}`, "");
    handleChange(`inputDefault_${fieldCount}`, "");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-[10px] text-muted-foreground">
          This node receives data from the parent workflow&apos;s Call Workflow node.
          Access values via <code className="text-primary">{"{{input.<name>}}"}</code>
        </p>
      </div>

      {fields.map((idx) => {
        const fieldName = meta[`inputName_${idx}`] || "";
        return (
          <div key={idx} className="space-y-1.5 rounded-md border p-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Input {idx}</Label>
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
              value={fieldName}
              onChange={(e) => handleChange(`inputName_${idx}`, e.target.value)}
              placeholder="e.g., city, token, userId"
            />
            <p className="text-[10px] text-muted-foreground">
              Accessed as {`{{input.${fieldName || "..."}}}`}
            </p>
            <Label className="text-[10px] text-muted-foreground">Default Value</Label>
            <Textarea
              className="min-h-[48px] text-xs font-mono"
              value={meta[`inputDefault_${idx}`] || ""}
              onChange={(e) => handleChange(`inputDefault_${idx}`, e.target.value)}
              placeholder="Used when no value is provided"
            />
          </div>
        );
      })}

      <Button
        variant="outline"
        size="xs"
        onClick={addField}
        className="w-full"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Input
      </Button>
    </div>
  );
}
