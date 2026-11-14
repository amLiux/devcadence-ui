"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      <div className="space-y-1.5">
        <Label className="text-xs">To</Label>
        <Input
          className="h-8 text-xs"
          placeholder="user@example.com"
          value={meta.to || ""}
          onChange={(event) => handleChange("to", event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">CC (optional)</Label>
          <Input
            className="h-8 text-xs"
            value={meta.cc || ""}
            onChange={(event) => handleChange("cc", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">BCC (optional)</Label>
          <Input
            className="h-8 text-xs"
            value={meta.bcc || ""}
            onChange={(event) => handleChange("bcc", event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Subject</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Weekly report"
          value={meta.subject || ""}
          onChange={(event) => handleChange("subject", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body (plain text)</Label>
        <Textarea
          className="min-h-20 text-xs"
          placeholder={"Hi {{previousStep.name}},"}
          value={meta.body || ""}
          onChange={(event) => handleChange("body", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">HTML body (optional)</Label>
        <Textarea
          className="min-h-16 text-xs font-mono"
          placeholder="<p>Hello</p>"
          value={meta.html || ""}
          onChange={(event) => handleChange("html", event.target.value)}
        />
      </div>
    </GmailSettingsShell>
  );
}
