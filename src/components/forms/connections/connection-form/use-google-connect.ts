"use client";

import { useCallback, useMemo, useState } from "react";

export const GOOGLE_SERVICE_OPTIONS = [
  { id: "gmail", label: "Gmail", hint: "Read, search, send and reply" },
  { id: "calendar", label: "Calendar", hint: "List and create events" },
  { id: "drive", label: "Drive", hint: "Upload and list files" },
  { id: "sheets", label: "Sheets", hint: "Read and append rows" },
] as const;

export function useGoogleConnect(input: {
  connectionId?: string;
  connectionName: string;
  returnTo: string;
  onDisconnected?: () => void;
}) {
  const [services, setServices] = useState<string[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);

  const toggleService = useCallback((id: string) => {
    setServices((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  }, []);

  const trimmedName = input.connectionName.trim();
  const canConnect = services.length > 0 && trimmedName.length > 0;

  const authorizeUrl = useMemo(() => {
    const params = new URLSearchParams({
      services: services.join(","),
      returnTo: input.returnTo,
    });
    if (trimmedName) params.set("name", trimmedName);
    if (input.connectionId) params.set("connectionId", input.connectionId);
    return `/api/oauth/google/start?${params.toString()}`;
  }, [input.connectionId, input.returnTo, services, trimmedName]);

  const { connectionId, onDisconnected } = input;

  const disconnect = useCallback(async () => {
    if (!connectionId || disconnecting) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/connections/${connectionId}/oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      if (onDisconnected) onDisconnected();
      else window.location.reload();
    } finally {
      setDisconnecting(false);
    }
  }, [connectionId, disconnecting, onDisconnected]);

  return { services, toggleService, canConnect, authorizeUrl, disconnect, disconnecting };
}
