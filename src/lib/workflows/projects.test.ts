import { describe, it, expect } from "vitest";
import type { Project } from "@/lib/types";
import {
  defaultProjectId,
  filterByProject,
  groupReusableWorkflows,
} from "./projects";

const shared: Project = {
  id: "shared",
  name: "Shared",
  description: "",
  isShared: true,
  createdAt: "",
  updatedAt: "",
};

const dashboard: Project = {
  id: "proj-dashboard",
  name: "devcadence-ui",
  description: "",
  isShared: false,
  createdAt: "",
  updatedAt: "",
};

const other: Project = {
  id: "proj-other",
  name: "other",
  description: "",
  isShared: false,
  createdAt: "",
  updatedAt: "",
};

const workflows = [
  { id: "wf-1", name: "Shared helper", projectId: "shared" },
  { id: "wf-2", name: "Dashboard job", projectId: "proj-dashboard" },
  { id: "wf-3", name: "Other job", projectId: "proj-other" },
];

describe("filterByProject", () => {
  it("returns everything for the All view", () => {
    expect(filterByProject(workflows, null)).toHaveLength(3);
  });

  it("returns only the selected project", () => {
    expect(filterByProject(workflows, "shared").map((w) => w.id)).toEqual(["wf-1"]);
  });
});

describe("defaultProjectId", () => {
  it("uses the selected project", () => {
    expect(defaultProjectId([shared, dashboard], dashboard.id)).toBe(dashboard.id);
  });

  it("falls back to Shared when All is selected", () => {
    expect(defaultProjectId([shared, dashboard], null)).toBe(shared.id);
  });
});

describe("groupReusableWorkflows", () => {
  it("offers the current project followed by Shared", () => {
    const groups = groupReusableWorkflows(workflows, [shared, dashboard, other], dashboard.id);

    expect(groups.map((group) => group.project.name)).toEqual(["devcadence-ui", "Shared"]);
    expect(groups[0].workflows.map((w) => w.id)).toEqual(["wf-2"]);
    expect(groups[1].workflows.map((w) => w.id)).toEqual(["wf-1"]);
  });

  it("does not repeat Shared when the current project is Shared", () => {
    const groups = groupReusableWorkflows(workflows, [shared, dashboard], shared.id);

    expect(groups.map((group) => group.project.id)).toEqual(["shared"]);
  });

  it("drops groups without workflows", () => {
    const groups = groupReusableWorkflows(
      [{ id: "wf-1", name: "Helper", projectId: "shared" }],
      [shared, dashboard],
      dashboard.id,
    );

    expect(groups.map((group) => group.project.id)).toEqual(["shared"]);
  });

  it("offers every project when the current one is unknown", () => {
    const groups = groupReusableWorkflows(workflows, [shared, dashboard, other]);

    expect(groups.map((group) => group.project.id)).toEqual([
      "shared",
      "proj-dashboard",
      "proj-other",
    ]);
  });
});
