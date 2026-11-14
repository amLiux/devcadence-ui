"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "../types";
import { GmailSettingsShell } from "./settings-shell";

export function SearchEmailsSettings({
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
        <Label className="text-xs">Search query</Label>
        <Input
          className="h-8 text-xs"
          placeholder="is:unread from:boss@example.com"
          value={meta.query || ""}
          onChange={(event) => handleChange("query", event.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          Gmail search syntax. Leave empty to read the inbox. Supports{" "}
          <code className="bg-muted px-1 rounded">{"{{expression}}"}</code>.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Max results (1-50)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="10"
          value={meta.maxResults || ""}
          onChange={(event) => handleChange("maxResults", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">messages</code> (array with id, threadId,
        from, subject, body) and <code className="bg-muted px-1 rounded">count</code>.
      </p>
    </GmailSettingsShell>
  );
}
