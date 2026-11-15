"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  consent_denied: "Authorization was cancelled. The connection was not created.",
  invalid_state: "The authorization response was invalid or expired. Try connecting again.",
  exchange_failed: "Google rejected the authorization code. Try connecting again.",
  profile_failed: "The account profile could not be read. Try connecting again.",
  not_configured: "This instance has no Google OAuth client configured.",
  unknown_provider: "Unknown OAuth provider.",
  reconnect_required: "Google authorization expired or was revoked. Reconnect the account.",
};

export function OAuthNotice() {
  const params = useSearchParams();
  const error = params.get("oauth_error");
  const connected = params.get("oauth") === "connected";

  if (!error && !connected) return null;

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
        <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
        <span>{ERROR_MESSAGES[error] ?? "The Google authorization failed. Try again."}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
      <span>Google account authorized. Workflow nodes can use it now.</span>
    </div>
  );
}
