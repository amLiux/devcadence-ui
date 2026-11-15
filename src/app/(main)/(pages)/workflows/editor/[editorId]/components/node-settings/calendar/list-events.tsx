"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";
import { DateTimeField } from "./date-time-field";

export function ListEventsSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <GoogleSettingsShell
      meta={meta}
      handleChange={handleChange}
      parentOutput={parentOutput}
      hasParentEdge={hasParentEdge}
    >
      <div className="space-y-1.5">
        <Label className="text-xs">Calendar ID</Label>
        <Input
          className="h-8 text-xs"
          placeholder="primary"
          value={meta.calendarId || ""}
          onChange={(event) => handleChange("calendarId", event.target.value)}
        />
      </div>
      <DateTimeField
        label="From"
        value={meta.timeMin || ""}
        onChange={(value) => handleChange("timeMin", value)}
        placeholder="{{previousStep.start}}"
        hint="Leave empty to start from now."
      />
      <DateTimeField
        label="To"
        value={meta.timeMax || ""}
        onChange={(value) => handleChange("timeMax", value)}
        hint="Leave empty for no upper bound."
      />
      <div className="space-y-1.5">
        <Label className="text-xs">Search text (optional)</Label>
        <Input
          className="h-8 text-xs"
          value={meta.query || ""}
          onChange={(event) => handleChange("query", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Max results (1-50)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="10"
          value={meta.maxResults || ""}
          onChange={(event) => handleChange("maxResults", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">events</code> and{" "}
        <code className="bg-muted px-1 rounded">count</code>.
      </p>
    </GoogleSettingsShell>
  );
}
