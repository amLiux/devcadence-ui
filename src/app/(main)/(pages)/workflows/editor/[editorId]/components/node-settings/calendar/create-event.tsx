"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
      <div className="space-y-1.5">
        <Label className="text-xs">Calendar ID</Label>
        <Input
          className="h-8 text-xs"
          placeholder="primary"
          value={meta.calendarId || ""}
          onChange={(event) => handleChange("calendarId", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Summary</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Standup with {{previousStep.name}}"
          value={meta.summary || ""}
          onChange={(event) => handleChange("summary", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Input
          className="h-8 text-xs"
          value={meta.description || ""}
          onChange={(event) => handleChange("description", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Location (optional)</Label>
        <Input
          className="h-8 text-xs"
          value={meta.location || ""}
          onChange={(event) => handleChange("location", event.target.value)}
        />
      </div>
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
      <div className="space-y-1.5">
        <Label className="text-xs">Attendees (comma separated)</Label>
        <Input
          className="h-8 text-xs"
          value={meta.attendees || ""}
          onChange={(event) => handleChange("attendees", event.target.value)}
        />
      </div>
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
