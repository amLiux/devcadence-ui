"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { JsonField } from "@/components/composed/json-field";
import {
  DEFAULT_CACHE_TTL_SECONDS,
  MAX_CACHE_TTL_SECONDS,
  MIN_CACHE_TTL_SECONDS,
} from "@/lib/workflows/nodes/http-cache";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";

export function HttpRequestSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const method = meta.method || "GET";
  const cacheEnabled = meta.cacheEnabled === "true";

  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> to reference data from previous steps. E.g. <code className="bg-muted px-1 rounded">{"{{previousStep.id}}"}</code> or <code className="bg-muted px-1 rounded">{"{{step1.token}}"}</code>.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">URL</Label>
        <Input className="h-8 text-xs font-mono" placeholder="https://api.example.com/{{previousStep.id}}" value={meta.url || ""} onChange={(e) => handleChange("url", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Method</Label>
        <select
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={meta.method || "GET"}
          onChange={(e) => handleChange("method", e.target.value)}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <JsonField
        label="Headers (JSON)"
        value={meta.headers || ""}
        onChange={(v) => handleChange("headers", v)}
        placeholder='{"Authorization": "Bearer {{previousStep.token}}"}'
        minHeight={80}
      />
      <JsonField
        label="Body (JSON)"
        value={meta.body || ""}
        onChange={(v) => handleChange("body", v)}
        placeholder='{"key": "{{previousStep.value}}"}'
        minHeight={80}
      />
      <div className="space-y-2 rounded-lg border border-border p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <Label htmlFor="http-cache-enabled" className="text-xs cursor-pointer">
              Cache response
            </Label>
            <p className="text-[10px] text-muted-foreground">
              {method === "GET"
                ? "Reuse the response for the configured time."
                : "Only GET requests can be cached."}
            </p>
          </div>
          <Switch
            id="http-cache-enabled"
            checked={cacheEnabled}
            disabled={method !== "GET"}
            onCheckedChange={(checked) => handleChange("cacheEnabled", checked === true ? "true" : "false")}
          />
        </div>
        {cacheEnabled && method === "GET" && (
          <div className="space-y-1.5">
            <Label htmlFor="http-cache-ttl" className="text-xs">
              Time to cache (seconds)
            </Label>
            <Input
              id="http-cache-ttl"
              type="number"
              min={MIN_CACHE_TTL_SECONDS}
              max={MAX_CACHE_TTL_SECONDS}
              step={1}
              className="h-8 text-xs"
              value={meta.cacheTtl ?? String(DEFAULT_CACHE_TTL_SECONDS)}
              onChange={(e) => handleChange("cacheTtl", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Between {MIN_CACHE_TTL_SECONDS} and {MAX_CACHE_TTL_SECONDS} seconds. Default{" "}
              {DEFAULT_CACHE_TTL_SECONDS}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
