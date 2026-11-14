import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getNewestInternalDate, listNewEmails } from "./client";
import { prepareGmailListenBody } from "./trigger";

vi.mock("@/lib/db", () => ({
  prisma: {
    triggerState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("./client", () => ({
  getNewestInternalDate: vi.fn(),
  listNewEmails: vi.fn(),
}));

const state = vi.mocked(prisma.triggerState);
const newestMock = vi.mocked(getNewestInternalDate);
const listMock = vi.mocked(listNewEmails);

beforeEach(() => {
  state.findUnique.mockReset();
  state.upsert.mockReset();
  newestMock.mockReset();
  listMock.mockReset();
});

describe("prepareGmailListenBody", () => {
  it("seeds the cursor on the first poll without firing", async () => {
    state.findUnique.mockResolvedValue(null);
    newestMock.mockResolvedValue(1700000000000);

    await expect(prepareGmailListenBody("wf-1", { query: "is:unread" })).resolves.toBeNull();

    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lastValue: "1700000000000", key: "is:unread" }),
      }),
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it("returns new emails and advances the cursor to the newest processed", async () => {
    state.findUnique.mockResolvedValue({ lastValue: "1000" } as never);
    listMock.mockResolvedValue([
      { id: "a", internalDate: 1500 },
      { id: "b", internalDate: 1800 },
    ] as never);

    const body = await prepareGmailListenBody("wf-1", { query: "is:unread", maxResults: 10 });

    expect(body?.emails.map((email) => email.id)).toEqual(["a", "b"]);
    expect(listMock).toHaveBeenCalledWith({ query: "is:unread", afterMs: 1000, maxResults: 10 });
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { lastValue: "1800" } }),
    );
  });

  it("does not move the cursor when there is nothing new", async () => {
    state.findUnique.mockResolvedValue({ lastValue: "5000" } as never);
    listMock.mockResolvedValue([] as never);

    await expect(prepareGmailListenBody("wf-1", { query: "x" })).resolves.toBeNull();
    expect(state.upsert).not.toHaveBeenCalled();
  });

  it("rejects a malformed job body", async () => {
    await expect(prepareGmailListenBody("wf-1", {})).rejects.toThrow(/Invalid gmail-listen/);
  });
});
