"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { PostgresConnectionSelect } from "./connection-select";

export function PostgresDeleteSettings({
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
        E.g. <code className="bg-muted px-1 rounded">{"id = {{previousStep.userId}}"}</code>.
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
        <Label className="text-xs">WHERE Clause (optional, empty = delete all)</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="id = {{previousStep.userId}}"
          value={meta.whereClause || ""}
          onChange={(event) => handleChange("whereClause", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-destructive">
        Warning: Empty WHERE clause will delete all rows.
      </p>
    </div>
  );
}
