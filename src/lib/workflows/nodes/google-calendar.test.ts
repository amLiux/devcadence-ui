import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent } from "@/lib/google-calendar";
import { handleCreateCalendarEvent, handleWatchCalendarEvents } from "./google-calendar";

vi.mock("@/lib/google-calendar", () => ({
  createEvent: vi.fn(),
  listEvents: vi.fn(),
}));

const createEventMock = vi.mocked(createEvent);

const chain = {
  name: "Trigger",
  output: { name: "Ana" },
  success: true,
  error: null,
} as never;

beforeEach(() => {
  createEventMock.mockReset();
});

describe("handleCreateCalendarEvent", () => {
  it("requires summary and dates", async () => {
    await expect(handleCreateCalendarEvent({}, chain)).resolves.toMatchObject({
      success: false,
      message: "Event summary is required",
    });
    await expect(
      handleCreateCalendarEvent({ summary: "Sync" }, chain),
    ).resolves.toMatchObject({ success: false, message: "Start and end are required" });
  });

  it("requires a time zone for picker values without offset", async () => {
    await expect(
      handleCreateCalendarEvent(
        { summary: "Sync", start: "2026-11-20T10:00", end: "2026-11-20T10:30" },
        chain,
      ),
    ).resolves.toMatchObject({
      success: false,
      message:
        "Time zone is required for picker values. Select one, or use an ISO date-time with an offset.",
    });
  });

  it("accepts picker values with a time zone", async () => {
    createEventMock.mockResolvedValue({ id: "e1", summary: "Sync", htmlLink: "url" } as never);

    await handleCreateCalendarEvent(
      {
        summary: "Sync with {{previousStep.name}}",
        start: "2026-11-20T10:00",
        end: "2026-11-20T10:30",
        timeZone: "America/Costa_Rica",
        attendees: "a@b.com, c@d.com",
      },
      chain,
    );

    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "Sync with Ana",
        timeZone: "America/Costa_Rica",
        attendees: ["a@b.com", "c@d.com"],
      }),
    );
  });

  it("accepts ISO values with an offset and no time zone", async () => {
    createEventMock.mockResolvedValue({ id: "e1", summary: "Sync", htmlLink: "url" } as never);

    await handleCreateCalendarEvent(
      {
        summary: "Sync",
        start: "2026-11-20T10:00:00-06:00",
        end: "2026-11-20T10:30:00-06:00",
      },
      chain,
    );

    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ start: "2026-11-20T10:00:00-06:00" }),
    );
  });

  it("surfaces API errors", async () => {
    createEventMock.mockRejectedValue(new Error("Calendar permission denied."));

    await expect(
      handleCreateCalendarEvent(
        {
          summary: "Sync",
          start: "2026-11-20T10:00",
          end: "2026-11-20T10:30",
          timeZone: "UTC",
        },
        chain,
      ),
    ).resolves.toMatchObject({ success: false, message: "Calendar permission denied." });
  });
});

describe("handleWatchCalendarEvents", () => {
  it("validates the trigger payload", () => {
    expect(handleWatchCalendarEvents({})).toMatchObject({ success: false });
    expect(handleWatchCalendarEvents({}, undefined, { events: [{}] })).toMatchObject({
      success: true,
    });
  });
});
