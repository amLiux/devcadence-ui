import { describe, expect, it } from "vitest";
import { buildRawEmail, stripReplyPrefix } from "./mime";

function decode(raw: string): string {
  return Buffer.from(raw, "base64url").toString("utf8");
}

describe("buildRawEmail", () => {
  it("builds a plain text message with the expected headers", () => {
    const raw = decode(
      buildRawEmail({ to: "dev@example.com", subject: "Hello", text: "Body line" }),
    );

    expect(raw).toContain("To: dev@example.com");
    expect(raw).toContain("Subject: Hello");
    expect(raw).toContain("MIME-Version: 1.0");
    expect(raw).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(raw).toContain(Buffer.from("Body line").toString("base64"));
  });

  it("adds cc, bcc and reply headers", () => {
    const raw = decode(
      buildRawEmail({
        to: "dev@example.com",
        cc: "cc@example.com",
        bcc: "bcc@example.com",
        subject: "Re: Hi",
        text: "ok",
        inReplyTo: "<msg-1@example.com>",
        references: "<msg-0@example.com> <msg-1@example.com>",
      }),
    );

    expect(raw).toContain("Cc: cc@example.com");
    expect(raw).toContain("Bcc: bcc@example.com");
    expect(raw).toContain("In-Reply-To: <msg-1@example.com>");
    expect(raw).toContain("References: <msg-0@example.com> <msg-1@example.com>");
  });

  it("uses multipart when an HTML body is present", () => {
    const raw = decode(
      buildRawEmail({ to: "dev@example.com", subject: "Hi", text: "plain", html: "<p>html</p>" }),
    );

    expect(raw).toContain("multipart/alternative");
    expect(raw).toContain(Buffer.from("plain").toString("base64"));
    expect(raw).toContain(Buffer.from("<p>html</p>").toString("base64"));
  });

  it("encodes non-ASCII subjects", () => {
    const raw = decode(buildRawEmail({ to: "dev@example.com", subject: "Café ñ", text: "x" }));

    expect(raw).toMatch(/Subject: =\?UTF-8\?B\?/);
  });
});

describe("stripReplyPrefix", () => {
  it("removes stacked Re:/Fwd: prefixes", () => {
    expect(stripReplyPrefix("Re: Fwd: Re: Invoice")).toBe("Invoice");
  });
});
