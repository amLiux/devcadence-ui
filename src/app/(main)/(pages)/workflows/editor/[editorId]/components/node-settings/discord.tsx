"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { JsonEditor } from "@/components/ui/json-editor";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";
import type { Connection } from "@/lib/types";

function ConnectionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { request } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    request<Connection[]>({ endpoint: "/api/connections" }).then((data) => {
      if (data) setConnections(data.filter((c) => c.type === "Discord"));
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

function DiscordSettingsShell({ meta, handleChange, parentOutput, hasParentEdge, children }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Discord Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      {children}
    </div>
  );
}

export function SendDiscordMessageSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <DiscordSettingsShell meta={meta} handleChange={handleChange} parentOutput={parentOutput} hasParentEdge={hasParentEdge}>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values in channel ID and message content.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Channel ID</Label>
        <Input className="h-8 text-xs" placeholder="1234567890123456789" value={meta.channelId || ""} onChange={(e) => handleChange("channelId", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message Content</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] font-mono"
          placeholder="Hello from {{previousStep.name}}"
          value={meta.content || ""}
          onChange={(e) => handleChange("content", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Embeds (optional JSON array)</Label>
        <JsonEditor
          value={meta.embeds || ""}
          onChange={(v) => handleChange("embeds", v)}
          placeholder={`[\n  {\n    "title": "Update",\n    "description": "Build finished"\n  }\n]`}
          minHeight={80}
        />
      </div>
    </DiscordSettingsShell>
  );
}

export function ReadDiscordMessagesSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <DiscordSettingsShell meta={meta} handleChange={handleChange} parentOutput={parentOutput} hasParentEdge={hasParentEdge}>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic channel ID. After = message ID or ISO timestamp.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Channel ID</Label>
        <Input className="h-8 text-xs" placeholder="1234567890123456789" value={meta.channelId || ""} onChange={(e) => handleChange("channelId", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Limit (1-100)</Label>
        <Input className="h-8 text-xs" placeholder="50" value={meta.limit || ""} onChange={(e) => handleChange("limit", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">After (message ID, optional)</Label>
        <Input className="h-8 text-xs" placeholder="1234567890123456789" value={meta.after || ""} onChange={(e) => handleChange("after", e.target.value)} />
      </div>
    </DiscordSettingsShell>
  );
}

export function SendDirectMessageSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <DiscordSettingsShell meta={meta} handleChange={handleChange} parentOutput={parentOutput} hasParentEdge={hasParentEdge}>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic user ID and content.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">User ID</Label>
        <Input className="h-8 text-xs" placeholder="1234567890123456789" value={meta.userId || ""} onChange={(e) => handleChange("userId", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message Content</Label>
        <textarea
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] font-mono"
          placeholder="Hello {{previousStep.username}}"
          value={meta.content || ""}
          onChange={(e) => handleChange("content", e.target.value)}
        />
      </div>
    </DiscordSettingsShell>
  );
}

export function ListenDiscordMessagesSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Discord Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Channel ID</Label>
        <Input className="h-8 text-xs" placeholder="1234567890123456789" value={meta.channelId || ""} onChange={(e) => handleChange("channelId", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Cron Expression</Label>
        <Input className="h-8 text-xs" placeholder="*/5 * * * *" value={meta.cron || ""} onChange={(e) => handleChange("cron", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Limit (1-100)</Label>
        <Input className="h-8 text-xs" placeholder="50" value={meta.limit || ""} onChange={(e) => handleChange("limit", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Activate the workflow to start polling. The worker remembers the last seen message ID.
      </p>
    </div>
  );
}
