"use client";

import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/composed/text-field";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";
import { DateTimeField } from "./date-time-field";
import { TimezoneSelect } from "./timezone-select";

export function CreateEventSettings({
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
      <TextField
        label="Summary"
        value={meta.summary || ""}
        onChange={(value) => handleChange("summary", value)}
        placeholder="Standup with {{previousStep.name}}"
      />
      <TextField
        label="Description"
        optional
        value={meta.description || ""}
        onChange={(value) => handleChange("description", value)}
      />
      <TextField
        label="Location"
        optional
        value={meta.location || ""}
        onChange={(value) => handleChange("location", value)}
      />
      <DateTimeField
        label="Start"
        value={meta.start || ""}
        onChange={(value) => handleChange("start", value)}
        hint="Picked times use the time zone below. Switch to expression to use {{previousStep.*}}."
      />
      <DateTimeField
        label="End"
        value={meta.end || ""}
        onChange={(value) => handleChange("end", value)}
      />
      <TimezoneSelect
        value={meta.timeZone || ""}
        onChange={(value) => handleChange("timeZone", value)}
      />
      <TextField
        label="Attendees"
        optional
        value={meta.attendees || ""}
        onChange={(value) => handleChange("attendees", value)}
        hint="Comma separated emails."
      />
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Add Google Meet link</span>
        <Switch
          checked={meta.addMeetLink === "true"}
          onCheckedChange={(checked) => handleChange("addMeetLink", String(checked))}
        />
      </label>
    </GoogleSettingsShell>
  );
}
