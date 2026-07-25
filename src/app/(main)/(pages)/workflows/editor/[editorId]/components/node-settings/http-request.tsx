"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "./types";

export function HttpRequestSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">URL</Label>
        <Input className="h-8 text-xs" placeholder="https://..." value={meta.url || ""} onChange={(e) => handleChange("url", e.target.value)} />
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
      <div className="space-y-1.5">
        <Label className="text-xs">Headers (JSON)</Label>
        <Textarea className="min-h-[80px] text-xs font-mono" placeholder='{"Authorization": "Bearer ..."}' value={meta.headers || ""} onChange={(e) => handleChange("headers", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body (JSON)</Label>
        <Textarea className="min-h-[80px] text-xs font-mono" placeholder='{"key": "value"}' value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
      </div>
    </div>
  );
}
