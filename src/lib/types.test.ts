import { describe, expect, it } from "vitest";
import { inferTriggerType, TRIGGER_TYPE_LABELS } from "./types";

function nodes(titles: string[]): string {
  return JSON.stringify(
    titles.map((title, index) => ({
      id: `n${index}`,
      type: "cardNode",
      position: { x: 0, y: 0 },
      data: { title, description: "", completed: false, current: false, metadata: {}, type: "Trigger" },
    })),
  );
}

describe("inferTriggerType", () => {
  it("detects the Google triggers", () => {
    expect(inferTriggerType(nodes(["Watch Emails"]))).toBe("gmail");
    expect(inferTriggerType(nodes(["New Calendar Event"]))).toBe("calendar");
  });

  it("keeps the existing triggers working", () => {
    expect(inferTriggerType(nodes(["Schedule"]))).toBe("schedule");
    expect(inferTriggerType(nodes(["Webhook"]))).toBe("webhook");
    expect(inferTriggerType(nodes(["Listen Discord Messages"]))).toBe("discord");
    expect(inferTriggerType(nodes(["Listen Commits"]))).toBe("github");
  });

  it("falls back to manual without a trigger", () => {
    expect(inferTriggerType(nodes(["HTTP Request"]))).toBe("manual");
    expect(inferTriggerType(null)).toBe("manual");
    expect(inferTriggerType("not json")).toBe("manual");
  });

  it("prefers the sub-workflow flag", () => {
    expect(inferTriggerType(nodes(["Input"]), "sub-workflow")).toBe("sub-workflow");
  });

  it("has a label for every trigger type", () => {
    expect(TRIGGER_TYPE_LABELS.gmail).toBe("Gmail Messages");
    expect(TRIGGER_TYPE_LABELS.calendar).toBe("Calendar Events");
    expect(TRIGGER_TYPE_LABELS.manual).toBe("Manual");
  });
});
