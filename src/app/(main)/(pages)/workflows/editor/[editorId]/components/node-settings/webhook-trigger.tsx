"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { Copy, Check } from "lucide-react";
import type { NodeSettingsProps } from "./types";
import type { Connection } from "@/lib/types";

function WebhookConnectionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { request } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    request<Connection[]>({ endpoint: "/api/connections" }).then((data) => {
      if (data) setConnections(data.filter((c) => c.type === "Webhook"));
    });
  }, [request]);

  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select webhook connection...</option>
      {connections.map((conn) => (
        <option key={conn.id} value={conn.id}>
          {conn.name}
        </option>
      ))}
    </select>
  );
}

export function WebhookSettings({ meta, handleChange }: NodeSettingsProps) {
  const [copied, setCopied] = useState(false);
  const webhookUrl = meta.connectionId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${meta.connectionId}`
    : "";

  const handleCopy = async () => {
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Webhook Connection</Label>
        <WebhookConnectionSelect
          value={meta.connectionId || ""}
          onChange={(v) => handleChange("connectionId", v)}
        />
      </div>

      {webhookUrl && (
        <div className="space-y-1.5">
          <Label className="text-xs">Webhook URL</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 h-8 flex items-center rounded-md border bg-muted px-2.5 text-xs font-mono truncate">
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="h-8 w-8 flex items-center justify-center rounded-md border bg-transparent hover:bg-muted transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            POST to this URL to trigger the workflow. Configure HMAC verification in the connection settings.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Test Payload (optional)</Label>
        <Textarea
          className="min-h-[80px] text-xs font-mono"
          placeholder='{"event": "push", "data": {...}}'
          value={meta.testPayload || ""}
          onChange={(e) => handleChange("testPayload", e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          JSON payload used when testing this trigger. Leave empty for a default test payload.
        </p>
      </div>
    </div>
  );
}
