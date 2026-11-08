"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { PostgresConnectionSelect } from "./connection-select";

export function PostgresInsertSettings({
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
        <Label className="text-xs">Connection</Label>
        <PostgresConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values.
        E.g. values:{" "}
        <code className="bg-muted px-1 rounded">
          {"{{previousStep.name}}, {{previousStep.email}}"}
        </code>
        .
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Table</Label>
        <Input
          className="h-8 text-xs"
          placeholder="users"
          value={meta.table || ""}
          onChange={(event) => handleChange("table", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Columns (comma-separated)</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="name, email, role"
          value={meta.columns || ""}
          onChange={(event) => handleChange("columns", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Values (comma-separated)</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="{{previousStep.name}}, {{previousStep.email}}, 'user'"
          value={meta.values || ""}
          onChange={(event) => handleChange("values", event.target.value)}
        />
      </div>
    </div>
  );
}
