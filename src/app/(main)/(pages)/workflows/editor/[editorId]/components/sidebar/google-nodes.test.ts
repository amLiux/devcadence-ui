import { describe, expect, it } from "vitest";
import { TITLE_HANDLERS } from "@/lib/workflows/node-handlers";
import { SETTINGS_REGISTRY } from "../node-settings";
import { actionNodes, triggerNodes } from "./node-definitions";
import { iconMap } from "./node-icons";

const googleNodes = [...triggerNodes, ...actionNodes].filter(
  (node) => node.requiresConnection === "Google",
);
const googleActions = actionNodes.filter((node) => node.requiresConnection === "Google");

describe("Google node catalog", () => {
  it("lists every Google node once", () => {
    const titles = googleNodes.map((node) => node.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles.length).toBeGreaterThan(0);
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

describe("Google node presentation", () => {
  it("moves calendar actions to the Scheduling category", () => {
    const calendar = actionNodes.filter((node) =>
      ["List Events", "Create Event"].includes(node.title),
    );
    expect(calendar).toHaveLength(2);
    for (const node of calendar) {
      expect(node.category).toBe("Scheduling");
    }
  });

  it("keeps messaging nodes in Communication", () => {
    const gmail = actionNodes.filter((node) =>
      ["Send Gmail", "Search Emails", "Reply to Email"].includes(node.title),
    );
    for (const node of gmail) {
      expect(node.category).toBe("Communication");
    }
  });

  it("has an icon for every Google node", () => {
    for (const node of googleNodes) {
      expect(iconMap[node.title], `missing icon for ${node.title}`).toBeDefined();
    }
  });
});
