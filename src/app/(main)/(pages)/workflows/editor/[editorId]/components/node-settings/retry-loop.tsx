"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";

export function RetryLoopSettings({
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
      <p className="text-[10px] text-muted-foreground">
        Makes an HTTP request and retries until a condition is met. Use{" "}
        <code className="bg-muted px-1 rounded">{"{{response.body.field}}"}</code>{" "}
        to reference the last response in the condition.
      </p>

      {/* HTTP Config */}
      <div className="space-y-1.5">
        <Label className="text-xs">URL</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="https://api.example.com/status"
          value={meta.url || ""}
          onChange={(e) => handleChange("url", e.target.value)}
        />
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
        <Textarea
          className="min-h-[60px] text-xs font-mono"
          placeholder='{"Authorization": "Bearer token"}'
          value={meta.headers || ""}
          onChange={(e) => handleChange("headers", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body (JSON)</Label>
        <Textarea
          className="min-h-[60px] text-xs font-mono"
          placeholder='{"key": "value"}'
          value={meta.body || ""}
          onChange={(e) => handleChange("body", e.target.value)}
        />
      </div>

      {/* Retry Config */}
      <div className="rounded-md bg-muted/50 p-3 space-y-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Retry Settings
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Max Retries</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              min={1}
              max={10}
              placeholder="3"
              value={meta.maxRetries || ""}
              onChange={(e) => handleChange("maxRetries", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delay (seconds)</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              min={1}
              max={30}
              placeholder="2"
              value={meta.delay || ""}
              onChange={(e) => handleChange("delay", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Condition (expression)</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="response.status === 200 && response.body.done === true"
            value={meta.condition || ""}
            onChange={(e) => handleChange("condition", e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">
            Must evaluate to true to stop retrying. Access response via{" "}
            <code className="bg-muted px-1 rounded">response.status</code> and{" "}
            <code className="bg-muted px-1 rounded">response.body</code>.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">On Failure (after retries exhausted)</Label>
          <select
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={meta.onFailure || "error"}
            onChange={(e) => handleChange("onFailure", e.target.value)}
          >
            <option value="error">Fail workflow (default)</option>
            <option value="skip">Skip — return last response</option>
          </select>
        </div>
      </div>
    </div>
  );
}
