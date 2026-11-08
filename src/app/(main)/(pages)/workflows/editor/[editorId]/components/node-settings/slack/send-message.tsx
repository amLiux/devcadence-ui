"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { SlackConnectionSelect } from "./connection-select";

export function SendMessageSettings({
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
        <Label className="text-xs">Slack Connection</Label>
        <SlackConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values in
        channel and message.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Channel ID or Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder="#general or C1234567890"
          value={meta.channel || ""}
          onChange={(event) => handleChange("channel", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] font-mono"
          placeholder="Hello from devdock!"
          value={meta.text || ""}
          onChange={(event) => handleChange("text", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Thread Timestamp (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="1234567890.123456"
          value={meta.threadTs || ""}
          onChange={(event) => handleChange("threadTs", event.target.value)}
        />
      </div>
    </div>
  );
}
