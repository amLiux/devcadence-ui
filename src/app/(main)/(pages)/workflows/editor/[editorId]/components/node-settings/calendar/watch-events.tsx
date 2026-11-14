"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <Label className="text-xs">Cron Expression</Label>
        <Input
          className="h-8 text-xs"
          placeholder="*/5 * * * *"
          value={meta.cron || ""}
          onChange={(event) => handleChange("cron", event.target.value)}
        />
        {cronPreview && <p className="text-[11px] text-muted-foreground">{cronPreview}</p>}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Uses incremental sync. The first poll only stores a sync token, so enabling the workflow does
        not fire on existing events. Output: <code className="bg-muted px-1 rounded">events</code>.
      </p>
    </div>
  );
}
