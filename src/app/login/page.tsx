import { redirect } from "next/navigation";
import { getAuthConfig, isAuthEnabled } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/current-user";
import { BrandPanel } from "./brand-panel";
import { LoginForm } from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  config: "The identity provider is not configured correctly. Check AUTH_OIDC_* and AUTH_SECRET.",
  state: "The sign-in request expired. Please try again.",
  denied: "Sign-in was cancelled or denied by the identity provider.",
  token: "The identity provider did not return an ID token.",
  link: "An account with this email already exists. Ask an administrator to link your identity.",
  auth: "Sign-in failed. Please try again.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string; logged_out?: string }>;
}

function safeNext(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const enabled = isAuthEnabled();
  const params = await searchParams;
  const next = safeNext(params.next);

  if (enabled) {
    const currentUser = await getCurrentUser().catch(() => null);
    if (currentUser) redirect(next);
  }

  let providerHost = "your identity provider";
  let error = params.error ? (ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.auth) : null;

  if (enabled) {
    try {
      providerHost = new URL(getAuthConfig().issuer).host;
    } catch {
      error = ERROR_MESSAGES.config;
    }
  } else {
    error = null;
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <LoginForm
          loginHref={`/api/auth/login?next=${encodeURIComponent(next)}`}
          providerHost={providerHost}
          error={error}
          notice={params.logged_out ? "You have been signed out." : null}
          disabled={!enabled}
        />
      </div>
    </main>
  );
}
