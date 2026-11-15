"use client";

import { TextAreaField } from "@/components/composed/text-area-field";
import { TextField } from "@/components/composed/text-field";
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
      <TextField
        label="Thread ID"
        value={meta.threadId || ""}
        onChange={(value) => handleChange("threadId", value)}
        placeholder="{{previousStep.threadId}}"
        inputClassName="font-mono"
        hint="Usually inherited from a Watch Emails or Search Emails node."
      />
      <TextAreaField
        label="Reply text"
        value={meta.body || ""}
        onChange={(value) => handleChange("body", value)}
        placeholder="Thanks, I'll take a look."
      />
      <TextAreaField
        label="HTML body"
        optional
        mono
        className="min-h-16"
        value={meta.html || ""}
        onChange={(value) => handleChange("html", value)}
      />
    </GmailSettingsShell>
  );
}
