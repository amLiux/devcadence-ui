"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import {
  CHANNEL_CONNECTION_TYPE,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/lib/notifications/settings";
import type { NotificationChannel } from "@/lib/notifications/message";
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

interface Feedback {
  ok: boolean;
  text: string;
}

export default function SettingsPage() {
  const { request } = useApi();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    try {
      const [saved, list] = await Promise.all([
        request<NotificationSettings>({ endpoint: "/api/settings/notifications" }),
        request<Connection[]>({ endpoint: "/api/connections" }),
      ]);
      if (saved) setSettings(saved);
      if (Array.isArray(list)) setConnections(list);
    } catch {
      setFeedback({ ok: false, text: "Could not load notification settings." });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    // State lands after the request resolves, not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const availableConnections = useMemo(() => {
    const required = CHANNEL_CONNECTION_TYPE[settings.channel];
    return connections.filter((connection) => connection.type === required);
  }, [connections, settings.channel]);

  const update = (patch: Partial<NotificationSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setFeedback(null);
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await request<NotificationSettings>({
        endpoint: "/api/settings/notifications",
        method: "PUT",
        data: settings,
      });
      if (saved) setSettings(saved);
      setFeedback({ ok: true, text: "Saved." });
      return true;
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      // Save first so the test uses exactly what is on screen.
      const saved = await request<NotificationSettings>({
        endpoint: "/api/settings/notifications",
        method: "PUT",
        data: settings,
      });
      if (saved) setSettings(saved);

      await request({ endpoint: "/api/settings/notifications/test", method: "POST" });
      setFeedback({ ok: true, text: "Test notification sent." });
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : "Could not send the test.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your dashboard.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Failure notifications
          </CardTitle>
          <CardDescription>
            Get a message when a scheduled or webhook run fails. Test runs from the editor are
            ignored.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
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
                  onCheckedChange={(checked) => update({ enabled: checked })}
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
                      update({
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
                    onChange={(event) => update({ connectionId: event.target.value || null })}
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
                    placeholder={
                      settings.channel === "email" ? "you@example.com" : "#alerts"
                    }
                    onChange={(event) => update({ target: event.target.value })}
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
                      update({ throttleMinutes: Number(event.target.value) || 1 })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Repeated failures of the same workflow are muted during this window.
                  </p>
                </div>
              </div>

              {feedback && (
                <p
                  className={`flex items-center gap-1.5 text-xs ${
                    feedback.ok ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {feedback.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {feedback.text}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void save()} disabled={saving || testing}>
                  {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void sendTest()}
                  disabled={saving || testing || !settings.connectionId}
                >
                  {testing ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1 h-3.5 w-3.5" />
                  )}
                  Send test
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
