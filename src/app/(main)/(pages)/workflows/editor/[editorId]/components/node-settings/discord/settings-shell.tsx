"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { useWorkflowDefault } from "../workflow-variables-context";
import { WorkflowDefaultsToggle } from "../workflow-defaults-toggle";
import { DiscordConnectionSelect } from "./connection-select";

export function DiscordSettingsShell({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
  children,
}: NodeSettingsProps & {
  parentOutput?: unknown;
  hasParentEdge?: boolean;
  children: ReactNode;
}) {
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

  return (
    <div className="space-y-3">
      {hasParentEdge &&
        (parentOutput ? (
          <InheritedDataPanel output={parentOutput} />
        ) : (
          <InheritedDataPanelDisabled />
        ))}
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
      {children}
    </div>
  );
}
