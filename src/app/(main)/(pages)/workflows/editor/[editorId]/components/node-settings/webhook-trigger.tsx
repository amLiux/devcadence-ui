"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { Copy, Check, Wand2, AlignLeft } from "lucide-react";
import { JsonEditor, formatJson, validateJson } from "@/components/ui/json-editor";
import type { NodeSettingsProps } from "./types";
import type { Connection } from "@/lib/types";
import { inferSchemaFromPayload } from "@/lib/json-schema";

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

  const handleInferSchema = () => {
    if (!meta.testPayload) return;
    try {
      const payload = JSON.parse(meta.testPayload);
      const schema = inferSchemaFromPayload(payload);
      handleChange("schemaJson", schema);
    } catch {
      // ignore invalid JSON
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
        <div className="flex items-center justify-between">
          <Label className="text-xs">Test Payload (optional)</Label>
          {meta.testPayload && (
            <button
              type="button"
              onClick={() => handleChange("testPayload", formatJson(meta.testPayload))}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <AlignLeft className="h-3 w-3" />
              Format
            </button>
          )}
        </div>
        <JsonEditor
          value={meta.testPayload || ""}
          onChange={(v) => handleChange("testPayload", v)}
          placeholder='{"event": "push", "data": {...}}'
          minHeight={80}
          error={validateJson(meta.testPayload || "")}
        />
        <p className="text-[10px] text-muted-foreground">
          JSON payload used when testing this trigger. Leave empty for a default test payload.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">JSON Schema (optional)</Label>
          <div className="flex items-center gap-2">
            {meta.testPayload && (
              <button
                type="button"
                onClick={handleInferSchema}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <Wand2 className="h-3 w-3" />
                Infer
              </button>
            )}
            {meta.schemaJson && (
              <button
                type="button"
                onClick={() => handleChange("schemaJson", formatJson(meta.schemaJson))}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <AlignLeft className="h-3 w-3" />
                Format
              </button>
            )}
          </div>
        </div>
        <JsonEditor
          value={meta.schemaJson || ""}
          onChange={(v) => handleChange("schemaJson", v)}
          placeholder='{"type":"object","properties":{"event":{"type":"string"}},"required":["event"]}'
          minHeight={100}
          error={validateJson(meta.schemaJson || "")}
        />
        <p className="text-[10px] text-muted-foreground">
          Incoming webhook payloads are validated against this schema. Empty = no validation.
        </p>
      </div>

      <div className="space-y-1.5 rounded-md border p-2">
        <Label className="text-xs">Rate Limiting</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Max requests</Label>
            <Input
              type="number"
              min={0}
              className="h-8 text-xs"
              placeholder="∞"
              value={meta.rateLimitRequests || ""}
              onChange={(e) => handleChange("rateLimitRequests", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Window (seconds)</Label>
            <Input
              type="number"
              min={1}
              className="h-8 text-xs"
              placeholder="60"
              value={meta.rateLimitWindowSeconds || ""}
              onChange={(e) => handleChange("rateLimitWindowSeconds", e.target.value)}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Leave Max requests empty for unlimited. Limit is checked per webhook trigger node.
        </p>
      </div>
    </div>
  );
}
