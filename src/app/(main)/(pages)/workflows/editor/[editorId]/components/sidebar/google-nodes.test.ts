import { describe, expect, it } from "vitest";
import { TITLE_HANDLERS } from "@/lib/workflows/node-handlers";
import { SETTINGS_REGISTRY } from "../node-settings";
import { actionNodes, triggerNodes } from "./node-definitions";

const googleNodes = [...triggerNodes, ...actionNodes].filter(
  (node) => node.requiresConnection === "Google",
);
const googleActions = actionNodes.filter((node) => node.requiresConnection === "Google");

describe("Google node catalog", () => {
  it("lists every Google node once", () => {
    const titles = googleNodes.map((node) => node.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles).toContain("Watch Emails");
    expect(titles).toContain("New Calendar Event");
    expect(titles).toContain("Append Rows");
    expect(titles).toContain("Append Text");
  });

  it("has a settings component for every Google node", () => {
    for (const node of googleNodes) {
      expect(SETTINGS_REGISTRY[node.title], `missing settings for ${node.title}`).toBeDefined();
    }
  });

  it("has a handler for every Google action", () => {
    for (const node of googleActions) {
      expect(TITLE_HANDLERS[node.title], `missing handler for ${node.title}`).toBeDefined();
    }
  });
});
