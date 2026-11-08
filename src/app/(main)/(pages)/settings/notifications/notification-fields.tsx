"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { NotificationChannel } from "@/lib/notifications/message";
import type { NotificationSettings } from "@/lib/notifications/settings";
import type { Connection } from "@/lib/types";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  slack: "Slack",
  email: "Email",
  discord: "Discord",
};

const TARGET_LABELS: Record<NotificationChannel, string> = {
  slack: "Channel (for example #alerts)",
  email: "Recipient email",
  discord: "Channel ID",
};

export function NotificationFields({
  settings,
  availableConnections,
  onChange,
}: {
  settings: NotificationSettings;
  availableConnections: Connection[];
  onChange: (patch: Partial<NotificationSettings>) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="notifications-enabled" className="text-sm">
            Enable notifications
          </Label>
          <p className="text-[11px] text-muted-foreground">
            One message per workflow per throttle window.
          </p>
        </div>
        <Switch
          id="notifications-enabled"
          checked={settings.enabled}
          onCheckedChange={(checked) => onChange({ enabled: checked })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="notification-channel" className="text-xs">
            Channel
          </Label>
          <select
            id="notification-channel"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={settings.channel}
            onChange={(event) =>
              onChange({
                channel: event.target.value as NotificationChannel,
                connectionId: null,
              })
            }
          >
            {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map((channel) => (
              <option key={channel} value={channel}>
                {CHANNEL_LABELS[channel]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notification-connection" className="text-xs">
            Connection
          </Label>
          <select
            id="notification-connection"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={settings.connectionId ?? ""}
            onChange={(event) => onChange({ connectionId: event.target.value || null })}
          >
            <option value="">Select a connection...</option>
            {availableConnections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name}
              </option>
            ))}
          </select>
          {availableConnections.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              No {CHANNEL_LABELS[settings.channel]} connection yet.{" "}
              <Link href="/connections" className="underline">
                Add one
              </Link>
              .
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notification-target" className="text-xs">
            {TARGET_LABELS[settings.channel]}
          </Label>
          <Input
            id="notification-target"
            className="h-8 text-xs"
            value={settings.target}
            placeholder={settings.channel === "email" ? "you@example.com" : "#alerts"}
            onChange={(event) => onChange({ target: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notification-throttle" className="text-xs">
            Throttle (minutes)
          </Label>
          <Input
            id="notification-throttle"
            type="number"
            min={1}
            max={1440}
            className="h-8 text-xs"
            value={settings.throttleMinutes}
            onChange={(event) =>
              onChange({ throttleMinutes: Number(event.target.value) || 1 })
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Repeated failures of the same workflow are muted during this window.
          </p>
        </div>
      </div>
    </>
  );
}
