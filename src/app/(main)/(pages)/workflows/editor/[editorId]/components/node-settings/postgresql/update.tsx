"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { PostgresConnectionSelect } from "./connection-select";

export function PostgresUpdateSettings({
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
        E.g. SET:{" "}
        <code className="bg-muted px-1 rounded">{"name = {{previousStep.newName}}"}</code>.
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
        <Label className="text-xs">SET Clause</Label>
        <Textarea
          className="min-h-[60px] text-xs font-mono"
          placeholder="name = {{previousStep.newName}}, email = {{previousStep.newEmail}}"
          value={meta.setClause || ""}
          onChange={(event) => handleChange("setClause", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">WHERE Clause (optional)</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="id = {{previousStep.userId}}"
          value={meta.whereClause || ""}
          onChange={(event) => handleChange("whereClause", event.target.value)}
        />
      </div>
    </div>
  );
}
