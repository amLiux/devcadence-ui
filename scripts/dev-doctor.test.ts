// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifyMigrations } from "./dev-doctor";

describe("classifyMigrations", () => {
  it("reports an in-sync database", () => {
    const state = classifyMigrations(["20260101_a", "20260102_b"], ["20260101_a", "20260102_b"]);

    expect(state.missingOnDisk).toEqual([]);
    expect(state.pending).toEqual([]);
    expect(state.failed).toEqual([]);
  });

  it("detects a database that is ahead of the branch", () => {
    const state = classifyMigrations(
      ["20260101_a"],
      ["20260101_a", "20260102_from_unmerged_branch"],
    );

    expect(state.missingOnDisk).toEqual(["20260102_from_unmerged_branch"]);
    expect(state.pending).toEqual([]);
  });

  it("detects migrations on disk that are not applied yet", () => {
    const state = classifyMigrations(["20260101_a", "20260102_b"], ["20260101_a"]);

    expect(state.pending).toEqual(["20260102_b"]);
    expect(state.missingOnDisk).toEqual([]);
  });

  it("detects failed migrations without duplicating them", () => {
    const state = classifyMigrations(
      ["20260101_a"],
      ["20260101_a", "20260102_broken"],
      ["20260102_broken", "20260102_broken"],
    );

    expect(state.failed).toEqual(["20260102_broken"]);
  });

  it("sorts every list so the output is stable", () => {
    const state = classifyMigrations(["b", "a"], ["c", "b"], ["z", "a"]);

    expect(state.onDisk).toEqual(["a", "b"]);
    expect(state.applied).toEqual(["b", "c"]);
    expect(state.failed).toEqual(["a", "z"]);
    expect(state.missingOnDisk).toEqual(["c"]);
    expect(state.pending).toEqual(["a"]);
  });
});
