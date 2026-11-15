"use client";

import { TextAreaField } from "@/components/composed/text-area-field";
import { TextField } from "@/components/composed/text-field";
import type { NodeSettingsProps } from "../types";
import { GmailSettingsShell } from "./settings-shell";

export function SendGmailSettings({
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
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values in
        to, subject, body, cc and bcc.
      </p>
      <TextField
        label="To"
        value={meta.to || ""}
        onChange={(value) => handleChange("to", value)}
        placeholder="user@example.com"
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="CC"
          optional
          value={meta.cc || ""}
          onChange={(value) => handleChange("cc", value)}
        />
        <TextField
          label="BCC"
          optional
          value={meta.bcc || ""}
          onChange={(value) => handleChange("bcc", value)}
        />
      </div>
      <TextField
        label="Subject"
        value={meta.subject || ""}
        onChange={(value) => handleChange("subject", value)}
        placeholder="Weekly report"
      />
      <TextAreaField
        label="Body (plain text)"
        value={meta.body || ""}
        onChange={(value) => handleChange("body", value)}
        placeholder={"Hi {{previousStep.name}},"}
      />
      <TextAreaField
        label="HTML body"
        optional
        mono
        className="min-h-16"
        value={meta.html || ""}
        onChange={(value) => handleChange("html", value)}
        placeholder="<p>Hello</p>"
      />
    </GmailSettingsShell>
  );
}
