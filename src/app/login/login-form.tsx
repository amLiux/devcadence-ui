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

export function LoginForm({ mode, next, providerHost, error, notice }: LoginFormProps) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <BrandMark />
        <div>
          <p className="text-sm font-semibold tracking-tight">DevCadence</p>
          <p className="text-xs text-muted-foreground">Workflow automation</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <LockKeyhole className="size-3" />
          {mode === "hortus" ? "Secure sign-in" : "Single sign-on"}
        </span>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          Sign in to your DevCadence workspace.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {notice ? (
          <div className="mt-5 flex gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <p>{notice}</p>
          </div>
        ) : null}

        {mode === "disabled" ? <DisabledNotice /> : null}
        {mode === "hortus" ? <CredentialsForm next={next} /> : null}
        {mode === "oidc" ? <SsoButton next={next} /> : null}

        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-5 text-muted-foreground">
            {mode === "hortus" ? (
              "Credentials are verified by your identity service. DevCadence never stores your password."
            ) : mode === "oidc" ? (
              <>
                You will be redirected to{" "}
                <span className="font-medium text-foreground">{providerHost}</span>. Your password
                never reaches DevCadence.
              </>
            ) : (
              "This page is a preview. Routes are not protected while authentication is disabled."
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need access? Ask your DevCadence administrator.
        </p>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Protected by OpenID Connect · PKCE · RS256
      </p>
    </div>
  );
}
