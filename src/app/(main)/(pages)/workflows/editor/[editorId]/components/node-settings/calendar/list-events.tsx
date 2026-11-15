"use client";

import { TextField } from "@/components/composed/text-field";
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
      <TextField
        label="Calendar ID"
        value={meta.calendarId || ""}
        onChange={(value) => handleChange("calendarId", value)}
        placeholder="primary"
      />
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
      <TextField
        label="Search text"
        optional
        value={meta.query || ""}
        onChange={(value) => handleChange("query", value)}
      />
      <TextField
        label="Max results"
        value={meta.maxResults || ""}
        onChange={(value) => handleChange("maxResults", value)}
        placeholder="10"
        hint="1-50."
      />
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">events</code> and{" "}
        <code className="bg-muted px-1 rounded">count</code>.
      </p>
    </GoogleSettingsShell>
  );
}
