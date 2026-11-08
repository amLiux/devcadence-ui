"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonField } from "@/components/composed/json-field";
import type { NodeSettingsProps } from "../types";
import { InheritedDataPanel } from "./inherited-data-panel";
import { InheritedDataPanelDisabled } from "./inherited-data-panel-disabled";

export function ConditionalSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge &&
        (parentOutput ? (
          <InheritedDataPanel output={parentOutput} />
        ) : (
          <InheritedDataPanelDisabled />
        ))}
      <div className="space-y-1.5">
        <Label className="text-xs">Condition</Label>
        <Input
          className="h-8 text-xs"
          placeholder="previousStep.status >= 400"
          value={meta.expression || ""}
          onChange={(event) => handleChange("expression", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Returns <code className="bg-muted px-1 rounded">true</code> or{" "}
        <code className="bg-muted px-1 rounded">false</code>. Connect the{" "}
        <span className="text-green-500 font-medium">green handle</span> for success and the{" "}
        <span className="text-red-500 font-medium">red handle</span> for failure. Use{" "}
        <code className="bg-muted px-1 rounded">previousStep.status</code> to access HTTP status.
      </p>
      <JsonField
        label="Sample Input (JSON, for standalone test)"
        value={meta.body || ""}
        onChange={(value) => handleChange("body", value)}
        placeholder='{"status": 200, "body": {...}}'
        minHeight={60}
      />
    </div>
  );
}
