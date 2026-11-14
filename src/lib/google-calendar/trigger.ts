import { prisma } from "@/lib/db";
import {
  listEventsIncremental,
  listUpcomingEvents,
  SyncTokenExpiredError,
  type CalendarEvent,
} from "./client";

export const CALENDAR_TRIGGER_TYPE = "calendar-listen";
const SYNC_TOKEN_KEY = "syncToken";

async function readSyncToken(workflowId: string, calendarId: string): Promise<string | null> {
  const state = await prisma.triggerState.findUnique({
    where: {
      workflowId_triggerType_key: {
        workflowId,
        triggerType: CALENDAR_TRIGGER_TYPE,
        key: `${calendarId}:${SYNC_TOKEN_KEY}`,
      },
    },
  });
  return state?.lastValue ?? null;
}

async function writeSyncToken(
  workflowId: string,
  calendarId: string,
  value: string,
): Promise<void> {
  const key = `${calendarId}:${SYNC_TOKEN_KEY}`;
  await prisma.triggerState.upsert({
    where: { workflowId_triggerType_key: { workflowId, triggerType: CALENDAR_TRIGGER_TYPE, key } },
    create: { workflowId, triggerType: CALENDAR_TRIGGER_TYPE, key, lastValue: value },
    update: { lastValue: value },
  });
}

/**
 * Polls Calendar with incremental sync. The first poll only stores a sync token
 * so enabling a workflow does not fire on the existing calendar.
 */
export async function prepareCalendarListenBody(
  workflowId: string,
  body: unknown,
): Promise<{ events: CalendarEvent[] } | null> {
  const config = body as { calendarId?: string } | undefined;
  const calendarId = config?.calendarId || "primary";

  const syncToken = await readSyncToken(workflowId, calendarId);
  if (!syncToken) {
    const full = await listUpcomingEvents({ calendarId });
    if (full.nextSyncToken) await writeSyncToken(workflowId, calendarId, full.nextSyncToken);
    return null;
  }

  try {
    const result = await listEventsIncremental({ calendarId, syncToken });
    if (result.nextSyncToken) await writeSyncToken(workflowId, calendarId, result.nextSyncToken);

    const events = result.events.filter((event) => event.status !== "cancelled");
    if (events.length === 0) return null;
    return { events };
  } catch (error) {
    if (!(error instanceof SyncTokenExpiredError)) throw error;
    const full = await listUpcomingEvents({ calendarId });
    if (full.nextSyncToken) await writeSyncToken(workflowId, calendarId, full.nextSyncToken);
    return null;
  }
}
