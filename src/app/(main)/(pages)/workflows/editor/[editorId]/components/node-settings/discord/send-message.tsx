"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonEditor } from "@/components/ui/json-editor";
import type { NodeSettingsProps } from "../types";
import { DiscordSettingsShell } from "./settings-shell";

export function SendDiscordMessageSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <DiscordSettingsShell
      meta={meta}
      handleChange={handleChange}
      parentOutput={parentOutput}
      hasParentEdge={hasParentEdge}
    >
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values in
        channel ID and message content.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Channel ID</Label>
        <Input
          className="h-8 text-xs"
          placeholder="1234567890123456789"
          value={meta.channelId || ""}
          onChange={(event) => handleChange("channelId", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message Content</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] font-mono"
          placeholder="Hello from {{previousStep.name}}"
          value={meta.content || ""}
          onChange={(event) => handleChange("content", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Embeds (optional JSON array)</Label>
        <JsonEditor
          value={meta.embeds || ""}
          onChange={(value) => handleChange("embeds", value)}
          placeholder={`[\n  {\n    "title": "Update",\n    "description": "Build finished"\n  }\n]`}
          minHeight={80}
        />
      </div>
    </DiscordSettingsShell>
  );
}
