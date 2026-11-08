"use client";

import { useState } from "react";
import { Check, Copy, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonField } from "@/components/composed/json-field";
import { inferSchemaFromPayload } from "@/lib/json-schema";
import type { NodeSettingsProps } from "../types";
import { WebhookConnectionSelect } from "./connection-select";

export function WebhookSettings({ meta, handleChange }: NodeSettingsProps) {
  const [copied, setCopied] = useState(false);
  const webhookUrl = meta.connectionId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${meta.connectionId}`
    : "";

  const handleCopy = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInferSchema = () => {
    if (!meta.testPayload) return;
    try {
      const payload = JSON.parse(meta.testPayload);
      handleChange("schemaJson", inferSchemaFromPayload(payload));
    } catch {
      // Ignore invalid JSON: the field already shows the parse error.
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Webhook Connection</Label>
        <WebhookConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
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
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            POST to this URL to trigger the workflow. Configure HMAC verification in the connection
            settings.
          </p>
        </div>
      )}

      <JsonField
        label="Test Payload (optional)"
        value={meta.testPayload || ""}
        onChange={(value) => handleChange("testPayload", value)}
        placeholder='{"event": "push", "data": {...}}'
        minHeight={80}
        hint="JSON payload used when testing this trigger. Leave empty for a default test payload."
      />

      <JsonField
        label="JSON Schema (optional)"
        value={meta.schemaJson || ""}
        onChange={(value) => handleChange("schemaJson", value)}
        placeholder='{"type":"object","properties":{"event":{"type":"string"}},"required":["event"]}'
        minHeight={100}
        hint="Incoming webhook payloads are validated against this schema. Empty = no validation."
        actions={
          meta.testPayload ? (
            <button
              type="button"
              onClick={handleInferSchema}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Wand2 className="h-3 w-3" />
              Infer
            </button>
          ) : null
        }
      />

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
              onChange={(event) => handleChange("rateLimitRequests", event.target.value)}
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
              onChange={(event) => handleChange("rateLimitWindowSeconds", event.target.value)}
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
