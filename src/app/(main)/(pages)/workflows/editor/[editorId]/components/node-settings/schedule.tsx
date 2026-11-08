"use client";

import { Input } from "@/components/ui/input";
import { toString as cronToString } from "cronstrue";
import type { NodeSettingsProps } from "./types";

export function ScheduleSettings({ meta, handleChange }: NodeSettingsProps) {
  let preview = "";
  if (meta.cron) {
    try {
      preview = cronToString(meta.cron);
    } catch {
      preview = "Invalid cron expression";
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Cron Expression</label>
        <Input
          className="h-8 text-xs"
          placeholder="*/5 * * * *"
          value={meta.cron || ""}
          onChange={(event) => handleChange("cron", event.target.value)}
        />
        {preview && <p className="text-[11px] text-muted-foreground">{preview}</p>}
      </div>
    </div>
  );
}
