"use client";

import { Label } from "@/components/ui/label";
import { TextField } from "@/components/composed/text-field";
import { toString as cronToString } from "cronstrue";
import type { NodeSettingsProps } from "../types";
import { GoogleConnectionSelect } from "../google/connection-select";

export function WatchCalendarEventsSettings({ meta, handleChange }: NodeSettingsProps) {
  let cronPreview = "";
  if (meta.cron) {
    try {
      cronPreview = cronToString(meta.cron);
    } catch {
      cronPreview = "Invalid cron expression";
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Google Connection</Label>
        <GoogleConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
        />
      </div>
      <TextField
        label="Calendar ID"
        value={meta.calendarId || ""}
        onChange={(value) => handleChange("calendarId", value)}
        placeholder="primary"
      />
      <TextField
        label="Cron Expression"
        value={meta.cron || ""}
        onChange={(value) => handleChange("cron", value)}
        placeholder="*/5 * * * *"
        hint={cronPreview || undefined}
      />
      <TextField
        label="Max results per poll"
        value={meta.maxResults || ""}
        onChange={(value) => handleChange("maxResults", value)}
        placeholder="25"
        hint="1-50."
      />
      <p className="text-[10px] text-muted-foreground">
        Uses incremental sync. The first poll only stores a sync token, so enabling the workflow does
        not fire on existing events. Output: <code className="bg-muted px-1 rounded">events</code>.
      </p>
    </div>
  );
}
