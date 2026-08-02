"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";
import type { Connection } from "@/lib/types";

function ConnectionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { request } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    request<Connection[]>({ endpoint: "/api/connections" }).then((data) => {
      if (data) setConnections(data.filter((c) => c.type === "SMTP"));
    });
  }, [request]);

  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select connection...</option>
      {connections.map((conn) => (
        <option key={conn.id} value={conn.id}>
          {conn.name}
        </option>
      ))}
    </select>
  );
}

export function SendEmailSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">SMTP Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values in to, subject, body, cc, bcc.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">To</Label>
        <Input className="h-8 text-xs" placeholder="user@example.com" value={meta.to || ""} onChange={(e) => handleChange("to", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">CC (optional)</Label>
        <Input className="h-8 text-xs" placeholder="cc@example.com" value={meta.cc || ""} onChange={(e) => handleChange("cc", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">BCC (optional)</Label>
        <Input className="h-8 text-xs" placeholder="bcc@example.com" value={meta.bcc || ""} onChange={(e) => handleChange("bcc", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Subject</Label>
        <Input className="h-8 text-xs" placeholder="Hello from devdock" value={meta.subject || ""} onChange={(e) => handleChange("subject", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] font-mono"
          placeholder="Email body or HTML"
          value={meta.body || ""}
          onChange={(e) => handleChange("body", e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="isHtml"
          checked={meta.isHtml === "true"}
          onCheckedChange={(checked) => handleChange("isHtml", checked === true ? "true" : "false")}
        />
        <Label htmlFor="isHtml" className="text-xs cursor-pointer">Send as HTML</Label>
      </div>
    </div>
  );
}
