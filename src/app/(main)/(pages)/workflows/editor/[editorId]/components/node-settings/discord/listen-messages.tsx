"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toString as cronToString } from "cronstrue";
import type { NodeSettingsProps } from "../types";
import { useWorkflowDefault } from "../workflow-variables-context";
import { WorkflowDefaultsToggle } from "../workflow-defaults-toggle";
import { DiscordConnectionSelect } from "./connection-select";

export function ListenDiscordMessagesSettings({ meta, handleChange }: NodeSettingsProps) {
  const connection = useWorkflowDefault(
    "discordConnection",
    meta.connectionId || "",
    (value) => handleChange("connectionId", value),
  );
  const channel = useWorkflowDefault("discordChannel", meta.channelId || "", (value) =>
    handleChange("channelId", value),
  );
  const available = connection.available && channel.available;
  const usingDefaults = connection.enabled && channel.enabled;

  const toggleDefaults = (checked: boolean) => {
    connection.toggle(checked);
    channel.toggle(checked);
  };

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
      <WorkflowDefaultsToggle
        available={available}
        enabled={usingDefaults}
        onChange={toggleDefaults}
      />
      <div className="space-y-1.5">
        <Label className="text-xs">Discord Connection</Label>
        <DiscordConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
          disabled={connection.enabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Channel ID</Label>
        <Input
          className="h-8 text-xs"
          placeholder="1234567890123456789"
          value={meta.channelId || ""}
          onChange={(event) => handleChange("channelId", event.target.value)}
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
      <div className="space-y-1.5">
        <Label className="text-xs">Limit (1-100)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="50"
          value={meta.limit || ""}
          onChange={(event) => handleChange("limit", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Activate the workflow to start polling. The worker remembers the last seen message ID.
      </p>
    </div>
  );
}
