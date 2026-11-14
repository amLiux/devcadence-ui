import { beforeEach, describe, expect, it, vi } from "vitest";
import { replyToThread, searchMessages, sendEmail } from "@/lib/gmail";
import {
  handleReplyToEmail,
  handleSearchEmails,
  handleSendGmail,
  handleWatchEmails,
} from "./gmail";

vi.mock("@/lib/gmail", () => ({
  sendEmail: vi.fn(),
  searchMessages: vi.fn(),
  replyToThread: vi.fn(),
}));

const sendMock = vi.mocked(sendEmail);
const searchMock = vi.mocked(searchMessages);
const replyMock = vi.mocked(replyToThread);

const chain = {
  name: "Watch Emails",
  output: { name: "Ana", threadId: "t-1" },
  success: true,
  error: null,
} as never;

beforeEach(() => {
  sendMock.mockReset();
  searchMock.mockReset();
  replyMock.mockReset();
});

describe("handleSendGmail", () => {
  it("requires a recipient and subject", async () => {
    await expect(handleSendGmail({ subject: "Hi", body: "x" }, chain)).resolves.toMatchObject({
      success: false,
      message: "Recipient (to) is required",
    });
    await expect(handleSendGmail({ to: "a@b.com", body: "x" }, chain)).resolves.toMatchObject({
      success: false,
      message: "Subject is required",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("resolves templates and sends", async () => {
    sendMock.mockResolvedValue({ id: "m1", threadId: "t1" });

    const result = await handleSendGmail(
      { to: "a@b.com", subject: "Hello {{previousStep.name}}", body: "Hi" },
      chain,
    );

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.com", subject: "Hello Ana" }),
    );
    expect(result).toMatchObject({ success: true, data: { messageId: "m1", threadId: "t1" } });
  });

  it("surfaces API errors without leaking internals", async () => {
    sendMock.mockRejectedValue(new Error("Gmail permission denied."));

    const result = await handleSendGmail(
      { to: "a@b.com", subject: "Hi", body: "x" },
      chain,
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Gmail permission denied.");
  });
});

describe("handleSearchEmails", () => {
  it("returns messages and count", async () => {
    searchMock.mockResolvedValue([{ id: "a" }, { id: "b" }] as never);

    const result = await handleSearchEmails({ query: "is:unread", maxResults: "2" }, chain);

    expect(searchMock).toHaveBeenCalledWith({ query: "is:unread", maxResults: 2 });
    expect(result).toMatchObject({ success: true, data: { count: 2 } });
  });
});

describe("handleReplyToEmail", () => {
  it("requires a thread id", async () => {
    await expect(handleReplyToEmail({ body: "x" }, chain)).resolves.toMatchObject({
      success: false,
      message: "Thread ID is required",
    });
  });

  it("inherits the thread id from the previous step", async () => {
    replyMock.mockResolvedValue({ id: "r1", threadId: "t-1" });

    const result = await handleReplyToEmail(
      { threadId: "{{previousStep.threadId}}", body: "Thanks" },
      chain,
    );

    expect(replyMock).toHaveBeenCalledWith(expect.objectContaining({ threadId: "t-1" }));
    expect(result.success).toBe(true);
  });
});

describe("handleWatchEmails", () => {
  it("fails with a clear message when there is no trigger payload", () => {
    expect(handleWatchEmails({})).toMatchObject({ success: false });
  });

  it("passes the worker payload through", () => {
    const emails = [{ id: "a" }, { id: "b" }];
    expect(handleWatchEmails({}, undefined, { emails })).toMatchObject({
      success: true,
      data: { emails },
    });
  });
});
