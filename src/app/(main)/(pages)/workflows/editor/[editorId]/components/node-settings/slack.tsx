"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";
import type { Connection } from "@/lib/types";

function ConnectionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { request } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    request<Connection[]>({ endpoint: "/api/connections" }).then((data) => {
      if (data) setConnections(data.filter((c) => c.type === "Slack"));
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

export function SendMessageSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Slack Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values in channel and message.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Channel ID or Name</Label>
        <Input className="h-8 text-xs" placeholder="#general or C1234567890" value={meta.channel || ""} onChange={(e) => handleChange("channel", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] font-mono"
          placeholder="Hello from devdock!"
          value={meta.text || ""}
          onChange={(e) => handleChange("text", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Thread Timestamp (optional)</Label>
        <Input className="h-8 text-xs" placeholder="1234567890.123456" value={meta.threadTs || ""} onChange={(e) => handleChange("threadTs", e.target.value)} />
      </div>
    </div>
  );
}
