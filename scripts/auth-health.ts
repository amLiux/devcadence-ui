#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TIMEOUT_MS = 5000;

export type AuthHealthTarget =
  | { kind: "disabled" }
  | {
      kind: "check";
      mode: "oidc" | "hortus";
      healthUrl: string;
      fallbackUrl?: string;
    }
  | { kind: "error"; message: string };

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function resolveAuthHealthTarget(env: Record<string, string | undefined>): AuthHealthTarget {
  const mode = (env.AUTH_MODE || "disabled").trim().toLowerCase();
  if (mode === "" || mode === "disabled") return { kind: "disabled" };

  if (mode === "oidc") {
    const issuer = env.AUTH_OIDC_ISSUER?.trim();
    if (!issuer) {
      return { kind: "error", message: "AUTH_OIDC_ISSUER is not set but AUTH_MODE=oidc." };
    }
    const base = normalizeBaseUrl(issuer);
    return {
      kind: "check",
      mode: "oidc",
      healthUrl: `${base}/health`,
      fallbackUrl: `${base}/.well-known/openid-configuration`,
    };
  }

  if (mode === "hortus") {
    const apiUrl = env.AUTH_API_URL?.trim();
    if (!apiUrl) {
      return { kind: "error", message: "AUTH_API_URL is not set but AUTH_MODE=hortus." };
    }
    return {
      kind: "check",
      mode: "hortus",
      healthUrl: `${normalizeBaseUrl(apiUrl)}/health`,
    };
  }

  return {
    kind: "error",
    message: `Unknown AUTH_MODE "${mode}". Use disabled, oidc or hortus.`,
  };
}

function providerLabel(mode: "oidc" | "hortus"): string {
  return mode === "oidc" ? "OIDC provider" : "HortusClavis API";
}

async function fetchStatus(url: string): Promise<{ ok: boolean; status: number; ms: number }> {
  const started = Date.now();
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { ok: response.ok, status: response.status, ms: Date.now() - started };
}

export function loadLocalEnv(path = ".env.local"): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

export async function main(): Promise<void> {
  if (process.env.AUTH_HEALTH_SKIP === "1") {
    console.log("auth health check skipped (AUTH_HEALTH_SKIP=1).");
    return;
  }

  const target = resolveAuthHealthTarget(process.env);

  if (target.kind === "disabled") {
    console.log("auth disabled; skipping provider health check.");
    return;
  }

  if (target.kind === "error") {
    console.error(`✗ ${target.message}`);
    process.exitCode = 1;
    return;
  }

  const label = providerLabel(target.mode);

  try {
    const health = await fetchStatus(target.healthUrl);
    if (health.ok) {
      console.log(
        `✓ ${label} healthy at ${target.healthUrl} (${health.status}, ${health.ms}ms).`,
      );
      return;
    }

    if (health.status === 404 && target.fallbackUrl) {
      const discovery = await fetchStatus(target.fallbackUrl);
      if (discovery.ok) {
        console.warn(
          `⚠ ${target.healthUrl} returned 404, but ${target.fallbackUrl} is reachable.`,
        );
        return;
      }
    }

    console.error(`✗ ${label} health check failed at ${target.healthUrl} (${health.status}).`);
    console.error("  Set AUTH_HEALTH_SKIP=1 to bypass this check.");
    process.exitCode = 1;
  } catch {
    console.error(`✗ Cannot reach ${label} at ${target.healthUrl}.`);
    console.error("  Start the auth provider or set AUTH_HEALTH_SKIP=1.");
    process.exitCode = 1;
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  loadLocalEnv();
  main().catch((error: unknown) => {
    console.error("✗ auth health check failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
