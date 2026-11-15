"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { SubpageHeader } from "@/components/composed/subpage-header";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";
import { OAuthSetupChecklist } from "./oauth-setup-checklist";
import { OAuthStepCard } from "./oauth-step-card";
import { useOAuthChecklist } from "./use-oauth-checklist";
import { OAUTH_GUIDE_STEPS } from "./steps";


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


export default function GoogleOAuthDocsPage() {
  const { markPage } = useDocsProgress();
  const checklist = useOAuthChecklist();
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

      <OAuthSetupChecklist {...checklist} />

      <div className="space-y-4">
        {OAUTH_GUIDE_STEPS.map((step, index) => (
          <OAuthStepCard
            key={step.id}
            step={step}
            index={index}
            checked={Boolean(checklist.done[step.id])}
            onToggle={() => checklist.toggle(step.id)}
          />
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
