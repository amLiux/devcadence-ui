"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";

export function ScrapeSettings({
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
      <p className="text-[10px] text-muted-foreground">
        Fetches a public page and extracts its main text. Localhost and private networks are
        blocked.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">URL</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="https://example.com/article"
          value={meta.url || ""}
          onChange={(event) => handleChange("url", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Output:{" "}
        <code className="bg-muted px-1 rounded">{"{{previousStep.url}}"}</code>,{" "}
        <code className="bg-muted px-1 rounded">{"{{previousStep.title}}"}</code> and{" "}
        <code className="bg-muted px-1 rounded">{"{{previousStep.text}}"}</code>.
      </p>
    </div>
  );
}
