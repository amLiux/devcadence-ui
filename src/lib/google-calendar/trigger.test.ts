import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { listEventsIncremental, listUpcomingEvents, SyncTokenExpiredError } from "./client";
import { prepareCalendarListenBody } from "./trigger";

vi.mock("@/lib/db", () => ({
  prisma: { triggerState: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

vi.mock("./client", () => ({
  listUpcomingEvents: vi.fn(),
  listEventsIncremental: vi.fn(),
  SyncTokenExpiredError: class SyncTokenExpiredError extends Error {},
}));

const state = vi.mocked(prisma.triggerState);
const fullMock = vi.mocked(listUpcomingEvents);
const incrementalMock = vi.mocked(listEventsIncremental);

beforeEach(() => {
  state.findUnique.mockReset();
  state.upsert.mockReset();
  fullMock.mockReset();
  incrementalMock.mockReset();
});

describe("prepareCalendarListenBody", () => {
  it("seeds the sync token on the first poll", async () => {
    state.findUnique.mockResolvedValue(null);
    fullMock.mockResolvedValue({ events: [], nextSyncToken: "sync-1" });

    await expect(prepareCalendarListenBody("wf-1", { calendarId: "primary" })).resolves.toBeNull();
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ lastValue: "sync-1" }) }),
    );
  });

  it("returns new events and filters cancelled ones", async () => {
    state.findUnique.mockResolvedValue({ lastValue: "sync-1" } as never);
    incrementalMock.mockResolvedValue({
      events: [
        { id: "a", status: "confirmed" },
        { id: "b", status: "cancelled" },
      ] as never,
      nextSyncToken: "sync-2",
    });

    const body = await prepareCalendarListenBody("wf-1", { calendarId: "primary" });

    expect(body?.events.map((event) => event.id)).toEqual(["a"]);
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { lastValue: "sync-2" } }),
    );
  });

  it("falls back to a full sync when the token expired", async () => {
    state.findUnique.mockResolvedValue({ lastValue: "stale" } as never);
    incrementalMock.mockRejectedValue(new SyncTokenExpiredError());
    fullMock.mockResolvedValue({ events: [], nextSyncToken: "sync-3" });

    await expect(prepareCalendarListenBody("wf-1", {})).resolves.toBeNull();
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { lastValue: "sync-3" } }),
    );
  });

  it("returns nothing when the poll has no events", async () => {
    state.findUnique.mockResolvedValue({ lastValue: "sync-1" } as never);
    incrementalMock.mockResolvedValue({ events: [], nextSyncToken: "sync-1" });

    await expect(prepareCalendarListenBody("wf-1", {})).resolves.toBeNull();
  });
});
