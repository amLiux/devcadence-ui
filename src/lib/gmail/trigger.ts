import { prisma } from "@/lib/db";
import { getNewestInternalDate, listNewEmails } from "./client";
import type { GmailMessage } from "./parse";

export const GMAIL_TRIGGER_TYPE = "gmail-listen";

async function readCursor(workflowId: string, query: string): Promise<string | null> {
  const state = await prisma.triggerState.findUnique({
    where: { workflowId_triggerType_key: { workflowId, triggerType: GMAIL_TRIGGER_TYPE, key: query } },
  });
  return state?.lastValue ?? null;
}

async function writeCursor(workflowId: string, query: string, value: string): Promise<void> {
  await prisma.triggerState.upsert({
    where: { workflowId_triggerType_key: { workflowId, triggerType: GMAIL_TRIGGER_TYPE, key: query } },
    create: { workflowId, triggerType: GMAIL_TRIGGER_TYPE, key: query, lastValue: value },
    update: { lastValue: value },
  });
}

/**
 * Polls Gmail for the trigger node.
 *
 * The first poll only seeds the cursor with the newest matching message so
 * enabling a workflow does not replay an old inbox. Subsequent polls return the
 * new messages (oldest first, capped per poll) and advance the cursor to the
 * newest one processed, so anything above the cap runs on the next tick.
 */
export async function prepareGmailListenBody(
  workflowId: string,
  body: unknown,
): Promise<{ emails: GmailMessage[] } | null> {
  const config = body as { query?: string; maxResults?: number } | undefined;
  if (!config || typeof config.query !== "string") {
    throw new Error("Invalid gmail-listen job body");
  }

  const cursor = await readCursor(workflowId, config.query);
  if (cursor === null) {
    const newest = await getNewestInternalDate(config.query);
    if (newest > 0) await writeCursor(workflowId, config.query, String(newest));
    return null;
  }

  const emails = await listNewEmails({
    query: config.query,
    afterMs: Number(cursor),
    maxResults: config.maxResults,
  });
  if (emails.length === 0) return null;

  const newest = emails[emails.length - 1].internalDate;
  await writeCursor(workflowId, config.query, String(newest));
  return { emails };
}
