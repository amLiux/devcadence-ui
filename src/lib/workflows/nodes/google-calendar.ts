import { createEvent, listEvents } from "@/lib/google-calendar";
import { resolveTemplates } from "@/lib/workflow-context";
import type { ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

const now = () => new Date().toISOString();

type Log = { type: "info" | "success" | "error"; message: string; timestamp: string };

function failure(message: string, logs: Log[]): NodeHandlerResult {
  logs.push({ type: "error", message, timestamp: now() });
  return { success: false, message, logs };
}

export async function handleListCalendarEvents(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const calendarId = meta.calendarId || "primary";
  const timeMin = meta.timeMin ? resolveTemplates(meta.timeMin, ancestorChain) : undefined;
  const timeMax = meta.timeMax ? resolveTemplates(meta.timeMax, ancestorChain) : undefined;
  const query = meta.query ? resolveTemplates(meta.query, ancestorChain) : undefined;
  const maxResults = Number.parseInt(meta.maxResults || "10", 10);

  try {
    logs.push({ type: "info", message: `Listing events from ${calendarId}`, timestamp: now() });
    const events = await listEvents({
      calendarId,
      timeMin,
      timeMax,
      query,
      maxResults: Number.isFinite(maxResults) ? maxResults : 10,
    });
    logs.push({
      type: "success",
      message: `Found ${events.length} event${events.length === 1 ? "" : "s"}`,
      timestamp: now(),
    });
    return {
      success: true,
      message: `Found ${events.length} events`,
      data: { events, count: events.length },
      logs,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to list events", logs);
  }
}

export async function handleCreateCalendarEvent(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const summary = resolveTemplates(meta.summary || "", ancestorChain).trim();
  const start = resolveTemplates(meta.start || "", ancestorChain).trim();
  const end = resolveTemplates(meta.end || "", ancestorChain).trim();
  const description = meta.description
    ? resolveTemplates(meta.description, ancestorChain)
    : undefined;
  const location = meta.location ? resolveTemplates(meta.location, ancestorChain) : undefined;
  const attendees = meta.attendees
    ? resolveTemplates(meta.attendees, ancestorChain)
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
    : undefined;

  if (!summary) return failure("Event summary is required", logs);
  if (!start || !end) return failure("Start and end are required (ISO date-time)", logs);

  try {
    logs.push({ type: "info", message: `Creating event "${summary}"`, timestamp: now() });
    const event = await createEvent({
      calendarId: meta.calendarId || "primary",
      summary,
      start,
      end,
      description,
      location,
      timeZone: meta.timeZone || undefined,
      attendees,
      addMeetLink: meta.addMeetLink === "true",
    });
    logs.push({ type: "success", message: `Event created: ${event.htmlLink}`, timestamp: now() });
    return { success: true, message: `Event created: ${event.summary}`, data: { event }, logs };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to create event", logs);
  }
}

/** Trigger payload is seeded by the worker poll; this validates it for manual tests. */
export function handleWatchCalendarEvents(
  _meta: Record<string, string>,
  _ancestorChain?: ContextStep,
  body?: Record<string, unknown>,
): NodeHandlerResult {
  if (!body || !Array.isArray(body.events)) {
    return {
      success: false,
      message: "No events in trigger payload. The trigger runs via the scheduled worker poll.",
    };
  }
  const count = body.events.length;
  return {
    success: true,
    message: `Triggered with ${count} event${count === 1 ? "" : "s"}`,
    data: body,
  };
}
