import { describe, it, expect } from "vitest";
import { resolveTriggerMetadata } from "./trigger-metadata";

describe("resolveTriggerMetadata", () => {
  it("resolves workflow variables in trigger fields", () => {
    const meta = {
      channelId: "{{workflow.discordChannel}}",
      connectionId: "conn-1",
      limit: "50",
    };

    expect(
      resolveTriggerMetadata(meta, { discordChannel: "1568166558176378900" }),
    ).toEqual({
      channelId: "1568166558176378900",
      connectionId: "conn-1",
      limit: "50",
    });
  });

  it("keeps the placeholder when the variable is missing", () => {
    expect(resolveTriggerMetadata({ channelId: "{{workflow.nope}}" }, {})).toEqual({
      channelId: "{{workflow.nope}}",
    });
  });

  it("leaves plain metadata untouched", () => {
    const meta = { cron: "*/5 * * * *", connectionId: "conn-1" };
    expect(resolveTriggerMetadata(meta, {})).toEqual(meta);
  });
});
