import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("@/lib/db/projects", () => ({
  getProjects: mocks.getProjects,
  createProject: mocks.createProject,
}));

const row = {
  id: "proj-1",
  name: "devcadence-ui",
  description: "The dashboard",
  isShared: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  _count: { workflows: 7 },
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  mocks.getProjects.mockReset();
  mocks.createProject.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getProjects.mockResolvedValue([row]);
  mocks.createProject.mockResolvedValue({ ...row, _count: undefined });
});

describe("GET /api/projects", () => {
  it("returns the projects with their workflow counts", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.projects[0]).toMatchObject({
      id: "proj-1",
      name: "devcadence-ui",
      workflowCount: 7,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns 500 when the query fails", async () => {
    mocks.getProjects.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});

describe("POST /api/projects", () => {
  it("rejects a blank name", async () => {
    const response = await post({ name: "   " });

    expect(response.status).toBe(400);
    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  it("trims the name before creating", async () => {
    const response = await post({ name: "  devcadence-ui  ", description: "Dashboard" });

    expect(response.status).toBe(201);
    expect(mocks.createProject).toHaveBeenCalledWith({
      name: "devcadence-ui",
      description: "Dashboard",
    });
    expect((await response.json()).name).toBe("devcadence-ui");
  });

  it("returns 500 when the insert fails", async () => {
    mocks.createProject.mockRejectedValue(new Error("db down"));

    const response = await post({ name: "devcadence-ui" });

    expect(response.status).toBe(500);
  });
});
