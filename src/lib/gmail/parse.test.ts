import { describe, expect, it } from "vitest";
import { decodeBase64Url, headerValue, htmlToText, parseGmailMessage } from "./parse";

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

const base = {
  id: "m1",
  threadId: "t1",
  labelIds: ["INBOX"],
  snippet: "Hello there",
  internalDate: "1700000000000",
  payload: {
    headers: [
      { name: "From", value: "Ana <ana@example.com>" },
      { name: "To", value: "dev@example.com" },
      { name: "Subject", value: "Invoice" },
      { name: "Date", value: "Tue, 14 Nov 2026 10:00:00 +0000" },
      { name: "Message-ID", value: "<m1@example.com>" },
    ],
  },
};

describe("headerValue", () => {
  it("matches case-insensitively", () => {
    expect(headerValue(base.payload.headers, "from")).toBe("Ana <ana@example.com>");
    expect(headerValue(base.payload.headers, "Reply-To")).toBe("");
  });
});

describe("decodeBase64Url", () => {
  it("decodes url-safe base64", () => {
    expect(decodeBase64Url(encode("hola"))).toBe("hola");
  });
});

describe("htmlToText", () => {
  it("strips tags, scripts and decodes entities", () => {
    expect(htmlToText("<p>Hi&nbsp;<b>there</b></p><script>x()</script>")).toBe("Hi there");
  });
});

describe("parseGmailMessage", () => {
  it("parses a plain text message", () => {
    const message = parseGmailMessage({
      ...base,
      payload: {
        ...base.payload,
        mimeType: "text/plain",
        body: { data: encode("Plain body") },
      },
    });

    expect(message).toMatchObject({
      id: "m1",
      threadId: "t1",
      from: "Ana <ana@example.com>",
      subject: "Invoice",
      body: "Plain body",
      internalDate: 1700000000000,
    });
  });

  it("prefers text/plain in a multipart message", () => {
    const message = parseGmailMessage({
      ...base,
      payload: {
        ...base.payload,
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/plain", body: { data: encode("plain version") } },
          { mimeType: "text/html", body: { data: encode("<p>html version</p>") } },
        ],
      },
    });

    expect(message.body).toBe("plain version");
  });

  it("falls back to HTML converted to text", () => {
    const message = parseGmailMessage({
      ...base,
      payload: {
        ...base.payload,
        mimeType: "text/html",
        body: { data: encode("<p>Only <b>html</b></p>") },
      },
    });

    expect(message.body).toBe("Only html");
  });

  it("uses zero for a missing internal date", () => {
    const message = parseGmailMessage({ ...base, internalDate: undefined });
    expect(message.internalDate).toBe(0);
  });
});
