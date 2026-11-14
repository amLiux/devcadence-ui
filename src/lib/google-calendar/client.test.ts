import { beforeEach, describe, expect, it, vi } from "vitest";
import { googleFetch } from "@/lib/google/token";
import {
  createEvent,
  listEvents,
  listEventsIncremental,
  SyncTokenExpiredError,
} from "./client";

vi.mock("@/lib/google/token", () => ({ googleFetch: vi.fn() }));

const fetchMock = vi.mocked(googleFetch);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const rawEvent = {
  id: "ev-1",
  summary: "Standup",
  description: "Daily",
  location: "Meet",
  start: { dateTime: "2026-11-20T10:00:00-06:00", timeZone: "America/Costa_Rica" },
  end: { dateTime: "2026-11-20T10:30:00-06:00" },
  htmlLink: "https://calendar.google.com/ev-1",
  status: "confirmed",
  attendees: [{ email: "a@b.com" }],
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe("listEvents", () => {
  it("maps events and passes the time window", async () => {
    fetchMock.mockResolvedValue(json({ items: [rawEvent] }));

    const events = await listEvents({ timeMin: "2026-11-20T00:00:00Z", maxResults: 3 });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/calendars/primary/events");
    expect(url).toContain("timeMin=2026-11-20T00%3A00%3A00Z");
    expect(url).toContain("maxResults=3");
    expect(events[0]).toMatchObject({ id: "ev-1", summary: "Standup", attendees: ["a@b.com"] });
  });

  it("maps 403 to a reconnect hint", async () => {
    fetchMock.mockResolvedValue(json({}, 403));
    await expect(listEvents({})).rejects.toThrow(/Calendar permission denied/);
  });
});

describe("createEvent", () => {
  it("builds the payload with attendees and a Meet request", async () => {
    fetchMock.mockResolvedValue(json(rawEvent));

    await createEvent({
      summary: "Sync",
      start: "2026-11-20T10:00:00-06:00",
      end: "2026-11-20T10:30:00-06:00",
      attendees: ["a@b.com"],
      addMeetLink: true,
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(init.body));

    expect(String(fetchMock.mock.calls[0][0])).toContain("conferenceDataVersion=1");
    expect(payload.summary).toBe("Sync");
    expect(payload.attendees).toEqual([{ email: "a@b.com" }]);
    expect(payload.conferenceData.createRequest.conferenceSolutionKey.type).toBe("hangoutsMeet");
  });
});

describe("listEventsIncremental", () => {
  it("returns events and the next sync token", async () => {
    fetchMock.mockResolvedValue(json({ items: [rawEvent], nextSyncToken: "sync-2" }));

    const result = await listEventsIncremental({ syncToken: "sync-1" });

    expect(result.nextSyncToken).toBe("sync-2");
    expect(result.events).toHaveLength(1);
  });

  it("throws SyncTokenExpiredError on 410", async () => {
    fetchMock.mockResolvedValue(json({}, 410));
    await expect(listEventsIncremental({ syncToken: "old" })).rejects.toBeInstanceOf(
      SyncTokenExpiredError,
    );
  });
});
