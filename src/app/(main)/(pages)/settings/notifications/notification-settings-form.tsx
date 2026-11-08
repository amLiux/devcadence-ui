"use client";

import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationFields } from "./notification-fields";
import { useNotificationSettings } from "./use-notification-settings";

export function NotificationSettingsForm() {
  const form = useNotificationSettings();

  if (form.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <NotificationFields
        settings={form.settings}
        availableConnections={form.availableConnections}
        onChange={form.update}
      />

      {form.feedback && (
        <p
          className={`flex items-center gap-1.5 text-xs ${
            form.feedback.ok ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {form.feedback.ok ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {form.feedback.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void form.save()} disabled={form.saving || form.testing}>
          {form.saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void form.sendTest()}
          disabled={form.saving || form.testing || !form.settings.connectionId}
        >
          {form.testing ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="mr-1 h-3.5 w-3.5" />
          )}
          Send test
        </Button>
      </div>
    </div>
  );
}
