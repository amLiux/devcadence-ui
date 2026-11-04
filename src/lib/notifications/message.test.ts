import { describe, it, expect } from "vitest";
import { buildFailureMessage, formatNotificationText, shouldNotify } from "./message";

describe("buildFailureMessage", () => {
  it("includes the node, the error and the run link", () => {
    const message = buildFailureMessage({
      workflowName: "Deploy alerts",
      failingNode: "HTTP Request",
      error: "503 Service Unavailable",
      runUrl: "https://devdock.local/workflows/editor/wf-1?run=run-1",
    });

    expect(message.title).toBe("Deploy alerts failed");
    expect(message.body).toBe(
      "Node: HTTP Request\nError: 503 Service Unavailable\nRun: https://devdock.local/workflows/editor/wf-1?run=run-1",
    );
  });

  it("omits the node when the failing step is unknown", () => {
    const message = buildFailureMessage({
      workflowName: "Nightly scan",
      failingNode: null,
      error: "One or more nodes failed",
      runUrl: "https://devdock.local/workflows/editor/wf-2?run=run-2",
    });

    expect(message.body.startsWith("Error:")).toBe(true);
  });

  it("falls back to a generic error", () => {
    const message = buildFailureMessage({
      workflowName: "Nightly scan",
      failingNode: null,
      error: null,
      runUrl: "https://devdock.local/workflows/editor/wf-2?run=run-2",
    });

    expect(message.body).toContain("Error: Unknown error");
  });
});

describe("formatNotificationText", () => {
  it("prefixes the title for chat channels", () => {
    expect(
      formatNotificationText({ title: "Deploy alerts failed", body: "Error: boom" }),
    ).toBe("❌ Deploy alerts failed\nError: boom");
  });
});

describe("shouldNotify", () => {
  const now = new Date("2026-11-02T12:00:00Z");

  it("allows the first failure", () => {
    expect(shouldNotify(null, now, 60)).toBe(true);
    expect(shouldNotify(undefined, now, 60)).toBe(true);
  });

  it("mutes failures inside the window", () => {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60_000);
    expect(shouldNotify(fiveMinutesAgo, now, 60)).toBe(false);
  });

  it("allows a failure once the window has passed", () => {
    const twoHoursAgo = new Date(now.getTime() - 120 * 60_000);
    expect(shouldNotify(twoHoursAgo, now, 60)).toBe(true);
  });

  it("treats a zero throttle as always notify", () => {
    const justNow = new Date(now.getTime() - 1000);
    expect(shouldNotify(justNow, now, 0)).toBe(true);
  });
});
