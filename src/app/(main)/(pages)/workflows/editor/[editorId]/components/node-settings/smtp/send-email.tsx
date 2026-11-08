"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { SmtpConnectionSelect } from "./connection-select";

export function SendEmailSettings({
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
        <Label className="text-xs">SMTP Connection</Label>
        <SmtpConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values in
        to, subject, body, cc, bcc.
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
      <div className="space-y-1.5">
        <Label className="text-xs">CC (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="cc@example.com"
          value={meta.cc || ""}
          onChange={(event) => handleChange("cc", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">BCC (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="bcc@example.com"
          value={meta.bcc || ""}
          onChange={(event) => handleChange("bcc", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Subject</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Hello from devdock"
          value={meta.subject || ""}
          onChange={(event) => handleChange("subject", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] font-mono"
          placeholder="Email body or HTML"
          value={meta.body || ""}
          onChange={(event) => handleChange("body", event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="isHtml"
          checked={meta.isHtml === "true"}
          onCheckedChange={(checked) =>
            handleChange("isHtml", checked === true ? "true" : "false")
          }
        />
        <Label htmlFor="isHtml" className="text-xs cursor-pointer">
          Send as HTML
        </Label>
      </div>
    </div>
  );
}
