"use client";

import { TextField } from "@/components/composed/text-field";
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
      <TextField
        label="Search query"
        value={meta.query || ""}
        onChange={(value) => handleChange("query", value)}
        placeholder="is:unread from:boss@example.com"
        hint={
          <>
            Gmail search syntax. Leave empty to read the inbox. Supports{" "}
            <code className="bg-muted px-1 rounded">{"{{expression}}"}</code>.
          </>
        }
      />
      <TextField
        label="Max results"
        value={meta.maxResults || ""}
        onChange={(value) => handleChange("maxResults", value)}
        placeholder="10"
        hint="1-50."
      />
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">messages</code> (array with id, threadId,
        from, subject, body) and <code className="bg-muted px-1 rounded">count</code>.
      </p>
    </GmailSettingsShell>
  );
}
