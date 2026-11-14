import { googleFetch } from "@/lib/google/token";

const BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarAttendee {
  email: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: string;
  end: string;
  timeZone: string;
  htmlLink: string;
  status: string;
  attendees: string[];
}

interface RawEventTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface RawEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: RawEventTime;
  end?: RawEventTime;
  htmlLink?: string;
  status?: string;
  attendees?: { email?: string }[];
}

function or<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

function toEvent(raw: RawEvent): CalendarEvent {
  return {
    id: or(raw.id, ""),
    summary: or(raw.summary, "(no title)"),
    description: or(raw.description, ""),
    location: or(raw.location, ""),
    start: or(raw.start?.dateTime, or(raw.start?.date, "")),
    end: or(raw.end?.dateTime, or(raw.end?.date, "")),
    timeZone: or(raw.start?.timeZone, ""),
    htmlLink: or(raw.htmlLink, ""),
    status: or(raw.status, "confirmed"),
    attendees: (raw.attendees ?? []).map((attendee) => or(attendee.email, "")).filter(Boolean),
  };
}

async function fail(response: Response): Promise<never> {
  const body = await response.text();
  let detail = body;
  try {
    detail = JSON.parse(body)?.error?.message ?? body;
  } catch {
    // keep raw body
  }

  if (response.status === 401) {
    throw new Error("Google authorization expired. Reconnect the Google account.");
  }
  if (response.status === 403) {
    if (/storage quota/i.test(detail)) {
      throw new Error("Calendar: the Google account has no storage left.");
    }
    throw new Error(
      `Calendar permission denied. Reconnect with the Calendar service selected. (${detail})`,
    );
  }
  if (response.status === 404) {
    throw new Error("Calendar not found. Check the calendar ID.");
  }
  if (response.status === 429) {
    throw new Error("Calendar rate limit reached. Retry later.");
  }
  throw new Error(`Calendar API ${response.status}: ${detail}`);
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await googleFetch(url, init);
  if (!response.ok) await fail(response);
  return (await response.json()) as T;
}

export async function listEvents(input: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  query?: string;
  maxResults?: number;
}): Promise<CalendarEvent[]> {
  const calendarId = encodeURIComponent(input.calendarId || "primary");
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(Math.min(Math.max(input.maxResults ?? 10, 1), 50)),
  });
  if (input.timeMin) params.set("timeMin", input.timeMin);
  if (input.timeMax) params.set("timeMax", input.timeMax);
  if (input.query) params.set("q", input.query);

  const body = await getJson<{ items?: RawEvent[] }>(
    `${BASE}/calendars/${calendarId}/events?${params.toString()}`,
  );
  return (body.items ?? []).map(toEvent);
}

export async function createEvent(input: {
  calendarId?: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  timeZone?: string;
  attendees?: string[];
  addMeetLink?: boolean;
}): Promise<CalendarEvent> {
  const calendarId = encodeURIComponent(input.calendarId || "primary");
  const timeZone = input.timeZone || undefined;

  const payload = {
    summary: input.summary,
    ...(input.description ? { description: input.description } : {}),
    ...(input.location ? { location: input.location } : {}),
    start: { dateTime: input.start, ...(timeZone ? { timeZone } : {}) },
    end: { dateTime: input.end, ...(timeZone ? { timeZone } : {}) },
    ...(input.attendees?.length
      ? { attendees: input.attendees.map((email) => ({ email })) }
      : {}),
    ...(input.addMeetLink
      ? {
          conferenceData: {
            createRequest: {
              requestId: `devcadence-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };

  const query = input.addMeetLink ? "?conferenceDataVersion=1" : "";
  const raw = await getJson<RawEvent>(`${BASE}/calendars/${calendarId}/events${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return toEvent(raw);
}

export class SyncTokenExpiredError extends Error {
  constructor() {
    super("Calendar sync token expired");
    this.name = "SyncTokenExpiredError";
  }
}

/**
 * Incremental sync for the trigger. Google expires sync tokens; callers catch
 * SyncTokenExpiredError and fall back to a full sync from now.
 */
export async function listEventsIncremental(input: {
  calendarId?: string;
  syncToken: string;
}): Promise<{ events: CalendarEvent[]; nextSyncToken: string | null }> {
  const calendarId = encodeURIComponent(input.calendarId || "primary");
  const params = new URLSearchParams({ syncToken: input.syncToken, showDeleted: "true" });

  const response = await googleFetch(
    `${BASE}/calendars/${calendarId}/events?${params.toString()}`,
  );
  if (response.status === 410) throw new SyncTokenExpiredError();
  if (!response.ok) await fail(response);

  const body = (await response.json()) as { items?: RawEvent[]; nextSyncToken?: string };
  return {
    events: (body.items ?? []).map(toEvent),
    nextSyncToken: body.nextSyncToken ?? null,
  };
}

/** Full sync used for the first poll and after a sync token expires. */
export async function listUpcomingEvents(input: {
  calendarId?: string;
}): Promise<{ events: CalendarEvent[]; nextSyncToken: string | null }> {
  const calendarId = encodeURIComponent(input.calendarId || "primary");
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: new Date().toISOString(),
    maxResults: "50",
  });

  const body = await getJson<{ items?: RawEvent[]; nextSyncToken?: string }>(
    `${BASE}/calendars/${calendarId}/events?${params.toString()}`,
  );
  return {
    events: (body.items ?? []).map(toEvent),
    nextSyncToken: body.nextSyncToken ?? null,
  };
}
