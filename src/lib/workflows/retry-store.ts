import { prisma } from "@/lib/db";
import {
  DEFAULT_RETRY_POLICY,
  resolveRetryPolicy,
  type RetryPolicy,
} from "./retry-config";

/** Reads the stored policy and throws if the database is unavailable. */
export async function loadRetryPolicy(): Promise<RetryPolicy> {
  const stored = await prisma.retrySetting.findUnique({ where: { id: "default" } });
  return resolveRetryPolicy(stored);
}

/**
 * Policy for the retry service. Falls back to the defaults so a settings read
 * can never block a workflow from failing cleanly.
 */
export async function getRetryPolicy(): Promise<RetryPolicy> {
  try {
    return await loadRetryPolicy();
  } catch (error) {
    console.error(
      "getRetryPolicy error:",
      error instanceof Error ? error.message : error,
    );
    return DEFAULT_RETRY_POLICY;
  }
}

export async function saveRetryPolicy(policy: RetryPolicy): Promise<RetryPolicy> {
  const saved = await prisma.retrySetting.upsert({
    where: { id: "default" },
    create: { id: "default", ...policy },
    update: policy,
  });
  return resolveRetryPolicy(saved);
}
