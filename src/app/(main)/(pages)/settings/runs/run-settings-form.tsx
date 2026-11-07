"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import { DEFAULT_RETRY_POLICY, type RetryPolicy } from "@/lib/workflows/retry-config";

interface Feedback {
  ok: boolean;
  text: string;
}

export function RunSettingsForm() {
  const { request } = useApi();
  const [policy, setPolicy] = useState<RetryPolicy>(DEFAULT_RETRY_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    try {
      const saved = await request<RetryPolicy>({ endpoint: "/api/settings/runs" });
      if (saved) setPolicy(saved);
    } catch {
      setFeedback({ ok: false, text: "Could not load retry settings." });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    // State lands after the request resolves, not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const update = (patch: Partial<RetryPolicy>) => {
    setPolicy((current) => ({ ...current, ...patch }));
    setFeedback(null);
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await request<RetryPolicy>({
        endpoint: "/api/settings/runs",
        method: "PUT",
        data: policy,
      });
      if (saved) setPolicy(saved);
      setFeedback({ ok: true, text: "Saved." });
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="retries-enabled" className="text-sm">
            Automatic retries
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Retry failed runs that look temporary. Manual retries stay available either way.
          </p>
        </div>
        <Switch
          id="retries-enabled"
          checked={policy.enabled}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="retries-max-attempts" className="text-xs">
            Max attempts
          </Label>
          <Input
            id="retries-max-attempts"
            type="number"
            min={1}
            max={10}
            className="h-8 text-xs"
            value={policy.maxAttempts}
            onChange={(event) => update({ maxAttempts: Number(event.target.value) || 1 })}
          />
          <p className="text-[10px] text-muted-foreground">
            Total attempts, including the first one. 1 to 10.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="retries-base-delay" className="text-xs">
            Base delay (seconds)
          </Label>
          <Input
            id="retries-base-delay"
            type="number"
            min={0}
            max={300}
            className="h-8 text-xs"
            value={Math.round(policy.baseDelayMs / 1000)}
            onChange={(event) =>
              update({ baseDelayMs: Math.max(0, Number(event.target.value) || 0) * 1000 })
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Wait before the second attempt. It grows 4x on each try, up to 5 minutes.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="retries-cooldown" className="text-xs">
            Manual cooldown (seconds)
          </Label>
          <Input
            id="retries-cooldown"
            type="number"
            min={0}
            max={300}
            className="h-8 text-xs"
            value={Math.round(policy.manualCooldownMs / 1000)}
            onChange={(event) =>
              update({
                manualCooldownMs: Math.max(0, Number(event.target.value) || 0) * 1000,
              })
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Minimum time between manual retries of the same run.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="retries-max-chain" className="text-xs">
            Max retry chain
          </Label>
          <Input
            id="retries-max-chain"
            type="number"
            min={1}
            max={50}
            className="h-8 text-xs"
            value={policy.maxChain}
            onChange={(event) => update({ maxChain: Number(event.target.value) || 1 })}
          />
          <p className="text-[10px] text-muted-foreground">
            Hard cap on linked runs, so a loop cannot create unbounded history.
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

      <Button size="sm" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
        Save
      </Button>
    </div>
  );
}
