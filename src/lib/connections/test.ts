import { Pool } from "pg";
import { aiConfigProblem, modelsUrl, resolveAIConfig } from "@/lib/ai/providers";
import { TESTABLE_CONNECTION_TYPES } from "@/lib/constants";
import { createSmtpTransporter } from "@/lib/smtp";
import type { ConnectionTestResult } from "@/lib/types";

export type { ConnectionTestResult };

export interface TestableConnection {
  type: string;
  config: Record<string, unknown>;
}

interface ProbeResult {
  ok: boolean;
  message: string;
}

const TIMEOUT_MS = 10_000;

export function isTestable(type: string): boolean {
  return TESTABLE_CONNECTION_TYPES.includes(type as never);
}

function text(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === "string" ? value.trim() : "";
}

function port(config: Record<string, unknown>, fallback: number): number {
  const parsed = Number.parseInt(text(config, "port"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function missing(field: string): ProbeResult {
  return { ok: false, message: `${field} is missing` };
}

/**
 * Provider errors can echo the credential back. Any secret-looking config value
 * that shows up in a message is replaced before it reaches the client.
 */
export function scrubSecrets(message: string, config: Record<string, unknown>): string {
  let safe = message;

  for (const [key, value] of Object.entries(config)) {
    if (!/token|password|secret|key/i.test(key)) continue;
    if (typeof value !== "string" || value.length < 4) continue;
    safe = safe.split(value).join("***");
  }

  return safe;
}

async function probeGitHub(config: Record<string, unknown>): Promise<ProbeResult> {
  const token = text(config, "patToken");
  if (!token) return missing("Personal Access Token");

  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) return { ok: false, message: `GitHub responded with ${res.status}` };

  const body = (await res.json()) as { login?: string };
  return { ok: true, message: body.login ? `Authenticated as ${body.login}` : "Authenticated" };
}

async function probeSlack(config: Record<string, unknown>): Promise<ProbeResult> {
  const token = text(config, "botToken");
  if (!token) return missing("Bot Token");

  const res = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = (await res.json()) as { ok?: boolean; error?: string; team?: string };
  if (!body.ok) return { ok: false, message: `Slack: ${body.error ?? `HTTP ${res.status}`}` };

  return { ok: true, message: body.team ? `Connected to ${body.team}` : "Token valid" };
}

async function probeDiscord(config: Record<string, unknown>): Promise<ProbeResult> {
  const token = text(config, "botToken");
  if (!token) return missing("Bot Token");

  const res = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) return { ok: false, message: `Discord responded with ${res.status}` };

  const body = (await res.json()) as { username?: string };
  return { ok: true, message: body.username ? `Bot @${body.username}` : "Token valid" };
}

async function probeSmtp(config: Record<string, unknown>): Promise<ProbeResult> {
  const host = text(config, "host");
  if (!host) return missing("SMTP Host");

  const secure = text(config, "secure");
  const transporter = createSmtpTransporter({
    host,
    port: port(config, 587),
    user: text(config, "user") || undefined,
    password: text(config, "password") || undefined,
    secure: secure === "true" ? true : secure === "false" ? false : undefined,
    fromEmail: text(config, "fromEmail"),
  });

  try {
    await transporter.verify();
    return { ok: true, message: "SMTP server reachable" };
  } finally {
    transporter.close();
  }
}

async function probePostgres(config: Record<string, unknown>): Promise<ProbeResult> {
  const host = text(config, "host");
  if (!host) return missing("Host");

  const pool = new Pool({
    host,
    port: port(config, 5432),
    database: text(config, "database"),
    user: text(config, "user"),
    password: text(config, "password"),
    max: 1,
    connectionTimeoutMillis: TIMEOUT_MS,
  });

  try {
    await pool.query("SELECT 1");
    return { ok: true, message: "Connected to PostgreSQL" };
  } finally {
    await pool.end();
  }
}

async function probeAi(config: Record<string, unknown>): Promise<ProbeResult> {
  const resolved = resolveAIConfig({
    provider: text(config, "provider"),
    baseUrl: text(config, "baseUrl"),
    apiKey: text(config, "apiKey"),
    model: text(config, "model"),
  });

  const problem = aiConfigProblem(resolved);
  if (problem) return { ok: false, message: problem };

  const headers: Record<string, string> = {};
  if (resolved.provider === "claude") {
    if (resolved.apiKey) headers["x-api-key"] = resolved.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (resolved.apiKey) {
    headers.Authorization = `Bearer ${resolved.apiKey}`;
  }

  const res = await fetch(modelsUrl(resolved.baseUrl), {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    return { ok: false, message: `${resolved.label} responded with ${res.status}` };
  }

  if (resolved.provider === "custom") {
    return { ok: true, message: `Endpoint reachable at ${resolved.baseUrl}` };
  }

  return { ok: true, message: `${resolved.label} key valid` };
}

async function probe(connection: TestableConnection): Promise<ProbeResult> {
  switch (connection.type) {
    case "GitHub":
      return probeGitHub(connection.config);
    case "Slack":
      return probeSlack(connection.config);
    case "Discord":
      return probeDiscord(connection.config);
    case "SMTP":
      return probeSmtp(connection.config);
    case "PostgreSQL":
      return probePostgres(connection.config);
    case "AI":
      return probeAi(connection.config);
    default:
      return { ok: false, message: `${connection.type} connections cannot be tested` };
  }
}

/**
 * Validates a connection's stored credentials without touching the workflow
 * engine. Never throws: the result is meant to be shown inline next to the
 * connection.
 */
export async function testConnectionConfig(
  connection: TestableConnection,
): Promise<ConnectionTestResult> {
  const startedAt = Date.now();

  if (!isTestable(connection.type)) {
    return {
      ok: false,
      latencyMs: 0,
      message: `${connection.type} connections cannot be tested`,
    };
  }

  try {
    const result = await probe(connection);
    return {
      ok: result.ok,
      latencyMs: Date.now() - startedAt,
      message: scrubSecrets(result.message, connection.config),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: scrubSecrets(message, connection.config),
    };
  }
}
