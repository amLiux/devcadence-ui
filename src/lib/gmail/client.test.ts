import { beforeEach, describe, expect, it, vi } from "vitest";
import { googleFetch } from "@/lib/google/token";
import { listNewEmails, replyToThread, searchMessages, sendEmail } from "./client";

vi.mock("@/lib/google/token", () => ({ googleFetch: vi.fn() }));

const fetchMock = vi.mocked(googleFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function message(id: string, internalDate: number, extra = {}) {
  return {
    id,
    threadId: `t-${id}`,
    internalDate: String(internalDate),
    snippet: `snippet ${id}`,
    payload: {
      headers: [
        { name: "From", value: "ana@example.com" },
        { name: "Subject", value: `Subject ${id}` },
        { name: "Message-ID", value: `<${id}@example.com>` },
      ],
      mimeType: "text/plain",
      body: { data: Buffer.from(`body ${id}`).toString("base64url") },
    },
    ...extra,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("searchMessages", () => {
  it("lists ids then fetches each message", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ messages: [{ id: "a" }, { id: "b" }] }))
      .mockResolvedValueOnce(jsonResponse(message("a", 1)))
      .mockResolvedValueOnce(jsonResponse(message("b", 2)));

    const messages = await searchMessages({ query: "is:unread", maxResults: 2 });

    expect(messages.map((m) => m.id)).toEqual(["a", "b"]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=is%3Aunread");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/messages/a?format=full");
  });

  it("returns an empty array when the query has no matches", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(searchMessages({ query: "nothing" })).resolves.toEqual([]);
  });

  it("clamps maxResults to 50", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await searchMessages({ query: "x", maxResults: 500 });

    expect(String(fetchMock.mock.calls[0][0])).toContain("maxResults=50");
  });

  it("maps 403 to a readable reconnect message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "denied" } }, 403));

    await expect(searchMessages({ query: "x" })).rejects.toThrow(/Gmail permission denied/);
  });

  it("maps 429 to a rate limit message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));
    await expect(searchMessages({ query: "x" })).rejects.toThrow(/rate limit/);
  });
});

describe("listNewEmails", () => {
  it("keeps only messages newer than the cursor, oldest first", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ messages: [{ id: "new" }, { id: "old" }] }))
      .mockResolvedValueOnce(jsonResponse(message("new", 2000)))
      .mockResolvedValueOnce(jsonResponse(message("old", 1000)))
      .mockResolvedValueOnce(jsonResponse(message("new", 2000)));

    const fresh = await listNewEmails({ query: "is:unread", afterMs: 1500 });

    expect(fresh.map((m) => m.id)).toEqual(["new"]);
  });

  it("returns nothing when no message beats the cursor", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ messages: [{ id: "old" }] }))
      .mockResolvedValueOnce(jsonResponse(message("old", 100)));

    await expect(listNewEmails({ query: "x", afterMs: 500 })).resolves.toEqual([]);
  });
});

describe("sendEmail", () => {
  it("posts the raw message and returns the ids", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "sent", threadId: "thread" }));

    const result = await sendEmail({ to: "a@b.com", subject: "Hi", text: "Body" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;

    expect(result).toEqual({ id: "sent", threadId: "thread" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/messages/send");
    expect(JSON.parse(String(init.body))).toHaveProperty("raw");
  });
});

describe("replyToThread", () => {
  it("derives recipient, subject and headers from the last message", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: "t1",
          messages: [
            message("m1", 1000),
            { ...message("m2", 2000), payload: { headers: [
              { name: "From", value: "ana@example.com" },
              { name: "Subject", value: "Re: Invoice" },
              { name: "Message-ID", value: "<m2@example.com>" },
              { name: "References", value: "<m1@example.com>" },
            ] } },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "reply", threadId: "t1" }));

    const result = await replyToThread({ threadId: "t1", text: "Thanks" });
    const sent = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    const raw = Buffer.from(sent.raw, "base64url").toString("utf8");

    expect(result.id).toBe("reply");
    expect(sent.threadId).toBe("t1");
    expect(raw).toContain("To: ana@example.com");
    expect(raw).toContain("Subject: Re: Invoice");
    expect(raw).toContain("In-Reply-To: <m2@example.com>");
    expect(raw).toContain("References: <m1@example.com> <m2@example.com>");
  });
});
