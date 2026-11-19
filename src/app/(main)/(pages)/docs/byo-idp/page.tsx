"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SubpageHeader } from "@/components/composed/subpage-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";
import { CodeBlock } from "./code-block";

const PROVIDERS = [
  { name: "HortusClavis", note: "Reference provider for the suite", badge: "Suite" },
  { name: "Microsoft Entra ID", note: "App registration + client secret" },
  { name: "Keycloak", note: "Confidential client, standard flow" },
  { name: "Authentik", note: "OAuth2/OpenID provider" },
  { name: "Google Workspace", note: "Internal or external OAuth app" },
  { name: "Any OIDC provider", note: "Discovery + RS256 ID tokens" },
];

const SUPPORTED = [
  "Authorization code flow",
  "PKCE S256",
  "RS256 ID tokens + JWKS",
  "Discovery via /.well-known/openid-configuration",
  "Refresh tokens (offline_access)",
  "Custom role claims (groups or hc.permissions)",
  "RP-initiated logout when the provider supports it",
];

const TROUBLESHOOTING = [
  {
    signal: "redirect_uri_mismatch",
    cause: "AUTH_REDIRECT_URI differs from the registered URI. Match is exact, no wildcards.",
  },
  {
    signal: "invalid_scope",
    cause: "Requested scopes are not enabled for the client. Register them first.",
  },
  {
    signal: "state / invalid_state",
    cause: "The login transaction expired (10 min) or the browser dropped the cookie.",
  },
  {
    signal: "link",
    cause: "The email already exists under another identity. An admin must link it.",
  },
  {
    signal: "backend (Hortus API mode)",
    cause: "AUTH_API_URL is wrong or the identity service is unreachable.",
  },
  {
    signal: "401 after a successful login",
    cause: "AUTH_SECRET changed, or the cookie is scoped to another host/domain.",
  },
];

export default function ByoIdpDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => {
    markPage("byo-idp");
  }, [markPage]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <SubpageHeader
        backHref="/docs"
        backLabel="Back to docs"
        title="Bring your own identity provider"
        description="devcadence is a standard OIDC client. Point it at your provider and your users keep the accounts, MFA and policies you already have."
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">What works today</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED.map((item) => (
              <Badge key={item} variant="outline" className="gap-1 text-[10px] font-normal">
                <Check className="h-3 w-3 text-emerald-500" />
                {item}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Anything that publishes a discovery document and signs ID tokens with RS256 should
            work. There is no provider-specific code path: the same client talks to HortusClavis,
            Entra ID, Keycloak or Authentik.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold">Providers</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Provider</th>
                  <th className="py-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map((provider) => (
                  <tr key={provider.name} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-medium">
                      <span className="flex items-center gap-1.5">
                        {provider.name}
                        {provider.badge ? (
                          <Badge className="px-1 py-0 text-[9px]">{provider.badge}</Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-1.5 text-muted-foreground">{provider.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/25 bg-emerald-500/[0.04]">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold">Using HortusClavis?</h2>
            <Badge variant="outline" className="border-emerald-500/40 text-[9px] text-emerald-600 dark:text-emerald-400">
              Reference provider
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            If your instance runs on the suite, the provider side is already solved: HortusClavis
            exposes OIDC with discovery, RS256/JWKS, PKCE and rotating refresh tokens. devcadence
            only needs a client.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Create the tenant service in HortusClavis. The auto-seeded actions{" "}
              <code className="rounded bg-muted px-1 text-[11px]">manage_*</code> and{" "}
              <code className="rounded bg-muted px-1 text-[11px]">run_workflows</code> drive the
              role mapping below.
            </li>
            <li>Register devcadence as a confidential OAuth client with the exact callback URI.</li>
            <li>Copy the client id and secret once, then set the env vars from the next section.</li>
          </ol>
          <CodeBlock>{`curl -s -X POST https://iam.example.com/admin/oauth-clients \\
  -H "Authorization: Bearer $HC_TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "devcadence",
    "service_id": "<service uuid>",
    "redirect_uris": ["https://devcadence.example.com/api/auth/callback"],
    "scopes": "openid profile email offline_access hc.permissions",
    "is_confidential": true
  }'`}</CodeBlock>
          <p className="text-xs text-muted-foreground">
            HortusClavis is one product in the suite, not a requirement. The same page applies to
            any other OIDC provider. See the{" "}
            <Link href="https://github.com/amLiux/HortusClavis" className="text-primary hover:underline">
              HortusClavis repo
            </Link>{" "}
            for the provider side.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">1. Register the client</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            In your provider, create a <strong>confidential</strong> client using the authorization
            code flow with PKCE. Register this exact callback:
          </p>
          <CodeBlock>{`https://devcadence.example.com/api/auth/callback`}</CodeBlock>
          <p className="text-sm text-muted-foreground">
            Scopes: <code className="rounded bg-muted px-1 text-[11px]">openid profile email</code>.
            Add <code className="rounded bg-muted px-1 text-[11px]">offline_access</code> if you
            want refresh tokens, and{" "}
            <code className="rounded bg-muted px-1 text-[11px]">hc.permissions</code> when the
            provider is HortusClavis.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">2. Configure devcadence</h2>
          </div>
          <CodeBlock>{`AUTH_MODE="oidc"
AUTH_OIDC_ISSUER="https://iam.example.com"
AUTH_OIDC_CLIENT_ID="<client id>"
AUTH_OIDC_CLIENT_SECRET="<client secret>"
AUTH_REDIRECT_URI="https://devcadence.example.com/api/auth/callback"
AUTH_SECRET="$(openssl rand -hex 32)"
AUTH_ADMIN_EMAILS="you@example.com"`}</CodeBlock>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1 text-[11px]">AUTH_OIDC_ISSUER</code> must be
              the public URL the browser reaches, not an internal hostname.
            </li>
            <li>
              <code className="rounded bg-muted px-1 text-[11px]">AUTH_SECRET</code> signs the
              session cookie. Rotating it logs everyone out.
            </li>
            <li>Restart the app after changing env vars; the config is read at request time.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Roles</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Signal</th>
                  <th className="py-1">Role</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="py-1.5 pr-3">Email in AUTH_ADMIN_EMAILS</td>
                  <td className="py-1.5 font-mono">admin</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-1.5 pr-3">Group in AUTH_ADMIN_GROUPS</td>
                  <td className="py-1.5 font-mono">admin</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-1.5 pr-3">
                    <code className="text-[11px]">manage_*</code> in{" "}
                    <code className="text-[11px]">hc.permissions</code>
                  </td>
                  <td className="py-1.5 font-mono">admin</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-1.5 pr-3">
                    <code className="text-[11px]">run_workflows</code> or{" "}
                    <code className="text-[11px]">edit_workflows</code>
                  </td>
                  <td className="py-1.5 font-mono">author</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-1.5 pr-3">Anything else</td>
                  <td className="py-1.5 font-mono">viewer</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Roles refresh on every login. The first user becomes admin when{" "}
            <code className="rounded bg-muted px-1">AUTH_BOOTSTRAP_FIRST_USER</code> is true and no
            admin email is configured.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold">Want the login to stay on your domain?</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            With <code className="rounded bg-muted px-1 text-[11px]">AUTH_MODE=oidc</code> the
            browser visits the provider&apos;s login page. If you prefer a devcadence-branded form,
            use <code className="rounded bg-muted px-1 text-[11px]">AUTH_MODE=hortus</code>: the
            form posts to the devcadence server, which calls{" "}
            <code className="rounded bg-muted px-1 text-[11px]">/auth/login</code> and{" "}
            <code className="rounded bg-muted px-1 text-[11px]">/auth/verify</code> on HortusClavis.
          </p>
          <p className="text-xs text-muted-foreground">
            That mode trades SSO and PKCE for branding: the password transits the devcadence
            server. Use it for first-party self-hosted instances, not for BYO IdP.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Security notes</h2>
          </div>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Users are keyed by <code className="rounded bg-muted px-1 text-[11px]">(issuer, sub)</code>,
              never by email. HortusClavis currently emits{" "}
              <code className="rounded bg-muted px-1 text-[11px]">email_verified: false</code>, so
              auto-linking by email is off by default.
            </li>
            <li>
              If an email already exists under another identity, login is rejected with a link
              error. An admin must link it; this prevents account takeover.
            </li>
            <li>
              Logout clears the local session. Ending the provider session is opt-in through{" "}
              <code className="rounded bg-muted px-1 text-[11px]">AUTH_UPSTREAM_LOGOUT</code> and
              depends on provider support.
            </li>
            <li>
              There is no rate limiting on <code className="rounded bg-muted px-1 text-[11px]">/api/auth/login</code>{" "}
              yet. Put it behind your ingress or a WAF.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Troubleshooting</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Signal</th>
                  <th className="py-1">Likely cause</th>
                </tr>
              </thead>
              <tbody>
                {TROUBLESHOOTING.map((row) => (
                  <tr key={row.signal} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-mono text-[11px]">{row.signal}</td>
                    <td className="py-1.5 text-muted-foreground">{row.cause}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
