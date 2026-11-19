import { CheckCircle2, CircleAlert, LockKeyhole } from "lucide-react";
import type { AuthMode } from "@/lib/auth/config";
import { BrandMark } from "./brand-mark";
import { CredentialsForm } from "./credentials-form";
import { DisabledNotice } from "./disabled-notice";
import { SsoButton } from "./sso-button";

interface LoginFormProps {
  mode: AuthMode;
  next: string;
  providerHost: string;
  error: string | null;
  notice: string | null;
}

const META: Record<AuthMode, string> = {
  hortus: "session · hmac-sha256",
  oidc: "openid connect · pkce · rs256",
  disabled: "auth disabled",
};

export function LoginForm({ mode, next, providerHost, error, notice }: LoginFormProps) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center gap-2.5 lg:hidden">
        <BrandMark className="size-8 rounded-lg" />
        <p className="font-mono text-sm lowercase tracking-tight">devcadence</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {mode === "hortus" ? "password" : mode === "oidc" ? "single sign-on" : "preview"}
        </p>

        <h1 className="mt-2 text-xl font-semibold lowercase tracking-tight">sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Continue to your devcadence workspace.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mt-4 flex gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <p>{notice}</p>
          </div>
        ) : null}

        {mode === "disabled" ? <DisabledNotice /> : null}
        {mode === "hortus" ? <CredentialsForm next={next} /> : null}
        {mode === "oidc" ? <SsoButton next={next} /> : null}

        <div className="mt-5 flex items-start gap-2 border-t border-border pt-4">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-5 text-muted-foreground">
            {mode === "hortus" ? (
              "Credentials are verified by your identity service. devcadence never stores your password."
            ) : mode === "oidc" ? (
              <>
                Redirects to{" "}
                <span className="font-mono text-[11px] text-foreground">{providerHost}</span>.
                Passwords never reach devcadence.
              </>
            ) : (
              "This is a preview. Routes are not protected while authentication is disabled."
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>{META[mode]}</span>
        <span>self-hosted</span>
      </div>
    </div>
  );
}
