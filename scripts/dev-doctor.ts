#!/usr/bin/env node
import { access, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import Redis from "ioredis";

const MIGRATIONS_DIR = resolve(process.cwd(), "prisma/migrations");
const SCHEMA_FILE = resolve(process.cwd(), "prisma/schema.prisma");
const CLIENT_DIR = resolve(process.cwd(), "src/generated/prisma");
const CONNECT_ATTEMPTS = 20;
const CONNECT_DELAY_MS = 500;
const STALE_CLIENT_TOLERANCE_MS = 2000;

export type MigrationState = {
  onDisk: string[];
  applied: string[];
  failed: string[];
  missingOnDisk: string[];
  pending: string[];
};

/**
 * Compare the migrations committed in this branch with the ones applied to the
 * database. Pure on purpose: the CLI and the tests share the same rules.
 */
export function classifyMigrations(
  onDisk: string[],
  applied: string[],
  failed: string[] = [],
): MigrationState {
  const disk = new Set(onDisk);
  const database = new Set(applied);
  const failedSet = new Set(failed);

  return {
    onDisk: [...onDisk].sort(),
    applied: [...applied].sort(),
    failed: [...failedSet].sort(),
    missingOnDisk: [...database].filter((name) => !disk.has(name)).sort(),
    pending: [...disk].filter((name) => !database.has(name)).sort(),
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readMigrationFolders(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function endpointLabel(url: string, fallbackPort: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, "");
    return `${parsed.hostname}:${parsed.port || fallbackPort}${path ? `/${path}` : ""}`;
  } catch {
    return "the configured endpoint";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function connectWithRetry(url: string): Promise<pg.Client> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt += 1) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      if (attempt < CONNECT_ATTEMPTS) {
        await sleep(CONNECT_DELAY_MS);
      }
    }
  }

  throw lastError;
}

function printHeader(): void {
  console.log("devcadence doctor");
  console.log("-----------------");
}

function printMigrationDrift(state: MigrationState): void {
  console.error("✗ The database has migrations that are not in this branch:");
  for (const name of state.missingOnDisk) {
    console.error(`    - ${name}`);
  }
  console.error("");
  console.error("  `prisma migrate dev` refuses to run in this state. Pick one:");
  console.error("    1. Switch back to the branch that owns those migrations.");
  console.error("    2. If they are obsolete, reset the local database:");
  console.error("       make db-reset && make db-migrate-deploy");
  console.error("    3. If the migration is obsolete but its leftover changes are harmless,");
  console.error("       remove the row and keep the data:");
  console.error("       make db-shell");
  console.error("       DELETE FROM _prisma_migrations WHERE migration_name = '<migration_name>';");
  console.error("    4. If you want to keep the migration, restore its folder and register it:");
  console.error("       npx prisma migrate resolve --applied <migration_name>");
  console.error("");
  console.error("  More context: DEVELOPMENT.md#migration-drift");
}

function printPending(state: MigrationState): void {
  console.error(`✗ ${state.pending.length} migration(s) on disk are not applied:`);
  for (const name of state.pending) {
    console.error(`    - ${name}`);
  }
  console.error("");
  console.error('  Run "make db-migrate" before starting the app.');
}

function printFailed(state: MigrationState): void {
  console.error(`✗ ${state.failed.length} migration(s) did not finish:`);
  for (const name of state.failed) {
    console.error(`    - ${name}`);
  }
  console.error("");
  console.error(
    "  Run `npx prisma migrate status` for details, then resolve or reset the database.",
  );
}

async function checkRedis(url: string | undefined): Promise<string | null> {
  if (!url) {
    return "REDIS_URL is not set";
  }

  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 1500,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });

  try {
    await client.connect();
    const pong = await client.ping();
    return pong === "PONG" ? null : `unexpected PING response: ${pong}`;
  } catch {
    return `cannot reach ${endpointLabel(url, "6379")}`;
  } finally {
    client.disconnect();
  }
}

async function warnIfClientIsStale(): Promise<void> {
  if (!(await exists(SCHEMA_FILE)) || !(await exists(CLIENT_DIR))) {
    return;
  }

  const [schema, client] = await Promise.all([stat(SCHEMA_FILE), stat(CLIENT_DIR)]);
  if (schema.mtimeMs > client.mtimeMs + STALE_CLIENT_TOLERANCE_MS) {
    console.warn("⚠ The Prisma client is older than prisma/schema.prisma.");
    console.warn('  Run "npx prisma generate" (npm run dev and npm run build already do it).');
  }
}

export async function main(): Promise<void> {
  printHeader();

  if (!(await exists(MIGRATIONS_DIR))) {
    console.error("✗ prisma/migrations not found. Run this command from the repository root.");
    process.exitCode = 1;
    return;
  }

  if (!(await exists(CLIENT_DIR))) {
    console.error("✗ The Prisma client is missing.");
    console.error('  Run "npx prisma generate" (npm install already does it).');
    process.exitCode = 1;
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL is not set.");
    console.error("  Copy the local defaults first: cp .env.example .env (or make env-init).");
    process.exitCode = 1;
    return;
  }

  const onDisk = await readMigrationFolders();
  const label = endpointLabel(url, "5432");

  let client: pg.Client;
  try {
    client = await connectWithRetry(url);
  } catch {
    console.error(`✗ Cannot reach PostgreSQL at ${label}.`);
    console.error('  Start the backing services with "make db-up".');
    process.exitCode = 2;
    return;
  }

  let rows: Array<{
    migration_name: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  }>;

  try {
    const result = await client.query<{
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>(
      `SELECT migration_name, finished_at, rolled_back_at
         FROM _prisma_migrations
        ORDER BY started_at`,
    );
    rows = result.rows;
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") {
      console.error("✗ The database has no migrations applied yet.");
      console.error('  Run "make db-migrate" to create the schema.');
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }

  const applied = rows.map((row) => row.migration_name);
  const failed = rows
    .filter((row) => row.finished_at === null || row.rolled_back_at !== null)
    .map((row) => row.migration_name);
  const state = classifyMigrations(onDisk, applied, failed);

  if (state.missingOnDisk.length > 0) {
    printMigrationDrift(state);
    process.exitCode = 1;
    return;
  }

  if (state.failed.length > 0) {
    printFailed(state);
    process.exitCode = 1;
    return;
  }

  if (state.pending.length > 0) {
    printPending(state);
    process.exitCode = 1;
    return;
  }

  await warnIfClientIsStale();
  console.log(`✓ Migrations in sync (${state.applied.length} applied) on ${label}.`);

  const redisUrl = process.env.REDIS_URL;
  const redisProblem = await checkRedis(redisUrl);
  if (redisProblem) {
    console.warn(`⚠ Redis: ${redisProblem}.`);
    console.warn(
      '  Run "make redis-up"; queues and scheduled workflows will not run until Redis is available.',
    );
  } else if (redisUrl) {
    console.log(`✓ Redis reachable at ${endpointLabel(redisUrl, "6379")}.`);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error("✗ dev doctor failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
