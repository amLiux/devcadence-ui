"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { PostgresConnectionSelect } from "./connection-select";

export function PostgresQuerySettings({
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
        E.g.{" "}
        <code className="bg-muted px-1 rounded">
          {"SELECT * FROM users WHERE id = {{previousStep.userId}}"}
        </code>
        .
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">SQL Query</Label>
        <Textarea
          className="min-h-[100px] text-xs font-mono"
          placeholder="SELECT * FROM users WHERE id = {{previousStep.userId}}"
          value={meta.sql || ""}
          onChange={(event) => handleChange("sql", event.target.value)}
        />
      </div>
    </div>
  );
}
