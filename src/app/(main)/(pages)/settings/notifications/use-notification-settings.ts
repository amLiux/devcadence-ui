"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/use-api";
import {
  CHANNEL_CONNECTION_TYPE,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/lib/notifications/settings";
import type { Connection } from "@/lib/types";

export interface Feedback {
  ok: boolean;
  text: string;
}

export function useNotificationSettings() {
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

  return {
    settings,
    availableConnections,
    loading,
    saving,
    testing,
    feedback,
    update,
    save,
    sendTest,
  };
}
