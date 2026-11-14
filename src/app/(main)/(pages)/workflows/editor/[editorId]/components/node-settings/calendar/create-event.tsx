"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

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
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Start (ISO)</Label>
          <Input
            className="h-8 text-xs"
            placeholder="2026-11-20T10:00:00-06:00"
            value={meta.start || ""}
            onChange={(event) => handleChange("start", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">End (ISO)</Label>
          <Input
            className="h-8 text-xs"
            placeholder="2026-11-20T10:30:00-06:00"
            value={meta.end || ""}
            onChange={(event) => handleChange("end", event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Time zone (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="America/Costa_Rica"
          value={meta.timeZone || ""}
          onChange={(event) => handleChange("timeZone", event.target.value)}
        />
      </div>
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
