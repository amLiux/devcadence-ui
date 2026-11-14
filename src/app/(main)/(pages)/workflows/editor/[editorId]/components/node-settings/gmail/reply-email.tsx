"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NodeSettingsProps } from "../types";
import { GmailSettingsShell } from "./settings-shell";

export function ReplyToEmailSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <GmailSettingsShell
      meta={meta}
      handleChange={handleChange}
      parentOutput={parentOutput}
      hasParentEdge={hasParentEdge}
    >
      <div className="space-y-1.5">
        <Label className="text-xs">Thread ID</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="{{previousStep.threadId}}"
          value={meta.threadId || ""}
          onChange={(event) => handleChange("threadId", event.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          Usually inherited from a Watch Emails or Search Emails node.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Reply text</Label>
        <Textarea
          className="min-h-20 text-xs"
          placeholder="Thanks, I'll take a look."
          value={meta.body || ""}
          onChange={(event) => handleChange("body", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">HTML body (optional)</Label>
        <Textarea
          className="min-h-16 text-xs font-mono"
          value={meta.html || ""}
          onChange={(event) => handleChange("html", event.target.value)}
        />
      </div>
    </GmailSettingsShell>
  );
}
