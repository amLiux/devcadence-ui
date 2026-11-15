"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { SubpageHeader } from "@/components/composed/subpage-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";
import { OAuthSetupChecklist } from "./oauth-setup-checklist";

interface Step {
  title: string;
  body: string;
  code?: string;
}

const steps: Step[] = [
  {
    title: "Create (or pick) a Google Cloud project",
    body: "Every DevCadence instance uses its own OAuth client. Do not reuse another team's project: the consent screen, quota and verification status belong to whoever owns it.",
    code: "https://console.cloud.google.com/projectcreate",
  },
  {
    title: "Enable the APIs you will use",
    body: "A node fails with 403 if its API is disabled, even when the scope was granted. Enable only the four below plus Docs if you use it.",
    code: `https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/drive.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=PROJECT_ID
https://console.cloud.google.com/apis/library/docs.googleapis.com?project=PROJECT_ID`,
  },
  {
    title: "Configure the consent screen",
    body: "Google Auth Platform → Get started. User type External, publishing status Testing while you validate. Add your own account under Test users, otherwise the consent is rejected with access_denied.",
    code: `https://console.cloud.google.com/auth/overview?project=PROJECT_ID
https://console.cloud.google.com/auth/audience?project=PROJECT_ID`,
  },
  {
    title: "Declare the scopes",
    body: "Data access → Add or remove scopes. If a scope is missing from the table, enable its API first or paste it in \"Manually add scopes\". DevCadence only requests the scopes of the services selected on the connection.",
    code: `openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/documents`,
  },
  {
    title: "Create the OAuth client",
    body: "Credentials → Create client → Web application. The redirect URI must match exactly, including scheme, host, port and path.",
    code: "http://localhost:3000/api/oauth/google/callback",
  },
  {
    title: "Put the credentials in the environment",
    body: "Add the client id and secret to the instance env file and restart the app: environment variables are read at boot, not on hot reload. The secret is never exposed to the browser.",
    code: `GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
# Optional, when the app is served from another host:
# GOOGLE_REDIRECT_URI="https://devcadence.example.com/api/oauth/google/callback"`,
  },
  {
    title: "Authorize the account from Connections",
    body: "Connections → Add Connection → Google → pick the services → Connect Google account. Return to the app with the green banner and the connection shows Connected as <email>. Reconnect whenever you add a service; Disconnect revokes the token and clears the stored credentials.",
  },
];

const scopes = [
  { scope: "gmail.modify", service: "Gmail", type: "Restricted", verify: "Verification + CASA" },
  { scope: "calendar.readonly / calendar.events", service: "Calendar", type: "Sensitive", verify: "Verification" },
  { scope: "drive.file", service: "Drive", type: "Non-sensitive", verify: "Not required" },
  { scope: "spreadsheets", service: "Sheets", type: "Sensitive", verify: "Verification" },
  { scope: "documents", service: "Docs", type: "Sensitive", verify: "Verification" },
];

const troubleshooting = [
  { error: "not_configured", cause: "GOOGLE_CLIENT_ID / SECRET missing, or the app was not restarted" },
  { error: "access_denied", cause: "Consent cancelled, or the account is not in Test users" },
  { error: "invalid_state", cause: "The callback took more than 10 minutes or was reloaded" },
  { error: "redirect_uri_mismatch (Google)", cause: "The client redirect URI differs from the callback" },
  { error: "invalid_scope (Google)", cause: "A requested scope is not declared in Data access" },
  { error: "Gmail permission denied", cause: "The Gmail service is not selected, or the API is disabled" },
  { error: "the Google account has no storage left", cause: "Drive/Docs/Sheets writes need free Google storage" },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-[11px] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export default function GoogleOAuthDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("google-oauth"); }, [markPage]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <SubpageHeader
        backHref="/docs"
        backLabel="Back to docs"
        title="Google OAuth setup"
        description="Configure the OAuth client for a self-hosted DevCadence instance."
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Who owns the OAuth client?</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            You do. DevCadence does not ship a shared Google client: each instance authorizes
            accounts with credentials from its own Google Cloud project. That keeps the consent
            screen, the quota and the verification status under the operator&apos;s control, which is
            the only sane model for self-hosting.
          </p>
          <p className="text-sm text-muted-foreground">
            This is <strong>not</strong> an app sign-in. The connection grants API access that
            workflow nodes use server-side; DevCadence still has no user accounts or sessions.
          </p>
        </CardContent>
      </Card>

      <OAuthSetupChecklist />

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">
                  {index + 1}
                </Badge>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                  {step.code && <CodeBlock>{step.code}</CodeBlock>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Scopes per service</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Service</th>
                  <th className="py-1 pr-3">Scope</th>
                  <th className="py-1 pr-3">Classification</th>
                  <th className="py-1">Production</th>
                </tr>
              </thead>
              <tbody>
                {scopes.map((row) => (
                  <tr key={row.scope} className="border-t border-border">
                    <td className="py-1.5 pr-3">{row.service}</td>
                    <td className="py-1.5 pr-3 font-mono text-[11px]">{row.scope}</td>
                    <td className="py-1.5 pr-3">{row.type}</td>
                    <td className="py-1.5">{row.verify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Gmail is the expensive one: its scopes are restricted, so public production use needs
            Google verification plus a security assessment (CASA). Drive&apos;s{" "}
            <code className="rounded bg-muted px-1">drive.file</code> avoids verification by only
            seeing files the app created or the user picked.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Testing vs production</h2>
          </div>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              In <strong>Testing</strong>, refresh tokens expire after 7 days and only the accounts
              listed as test users can authorize. The app shows &quot;unverified&quot; until you
              publish.
            </li>
            <li>
              A team on Google Workspace can publish the app as <strong>Internal</strong>, which
              skips verification for the organisation.
            </li>
            <li>
              Public production needs a privacy policy, a verified domain and Google review; Gmail
              adds the restricted-scope assessment.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold">Troubleshooting</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Signal</th>
                  <th className="py-1">Likely cause</th>
                </tr>
              </thead>
              <tbody>
                {troubleshooting.map((row) => (
                  <tr key={row.error} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-mono text-[11px]">{row.error}</td>
                    <td className="py-1.5">{row.cause}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 text-sm">
        <Link href="/connections" className="inline-flex items-center gap-1 text-primary hover:underline">
          Go to Connections <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link href="/docs/connections" className="text-muted-foreground hover:text-foreground">
          Back to Connections &amp; Triggers
        </Link>
      </div>
    </div>
  );
}
