"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "../types";
import { DiscordSettingsShell } from "./settings-shell";

export function ReadDiscordMessagesSettings({
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
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic channel
        ID. After = message ID or ISO timestamp.
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
        <Label className="text-xs">Limit (1-100)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="50"
          value={meta.limit || ""}
          onChange={(event) => handleChange("limit", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">After (message ID, optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="1234567890123456789"
          value={meta.after || ""}
          onChange={(event) => handleChange("after", event.target.value)}
        />
      </div>
    </DiscordSettingsShell>
  );
}
