import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  getProject: vi.fn(),
  getDefaultProjectId: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    workflow: { findMany: mocks.findMany, create: mocks.create },
  },
}));

vi.mock("@/lib/db/projects", () => ({
  getProject: mocks.getProject,
  getDefaultProjectId: mocks.getDefaultProjectId,
}));

function get(query = "") {
  return GET(new Request(`http://localhost/api/workflows${query}`));
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const row = {
  id: "wf-1",
  name: "Deploy alerts",
  description: "notify",
  type: "sub-workflow",
  projectId: "shared",
  nodes: "[]",
  edges: "[]",
  flowPath: null,
  status: "draft",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.create.mockReset();
  mocks.getProject.mockReset();
  mocks.getDefaultProjectId.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.findMany.mockResolvedValue([row]);
  mocks.create.mockResolvedValue(row);
  mocks.getDefaultProjectId.mockResolvedValue("shared");
  mocks.getProject.mockResolvedValue({ id: "proj-1" });
});

describe("GET /api/workflows", () => {
  it("returns the full workflows by default", async () => {
    const response = await get("?type=sub-workflow");
    const body = await response.json();

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { type: "sub-workflow" },
      orderBy: { updatedAt: "desc" },
    });
    expect(body.workflows[0]).toMatchObject({
      id: "wf-1",
      projectId: "shared",
      nodes: "[]",
      edges: "[]",
    });
  });

  it("selects only id and name in compact mode", async () => {
    mocks.findMany.mockResolvedValue([{ id: "wf-1", name: "Deploy alerts" }]);

    const response = await get("?type=sub-workflow&compact=1");
    const body = await response.json();

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { type: "sub-workflow" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    });
    expect(body).toEqual({ workflows: [{ id: "wf-1", name: "Deploy alerts" }] });
  });

  it("filters by project", async () => {
    await get("?projectId=proj-1");

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("sends an empty filter when nothing is provided", async () => {
    await get("?compact=1");

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    });
  });

  it("returns 500 when the query fails", async () => {
    mocks.findMany.mockRejectedValue(new Error("db down"));

    const response = await get("?compact=1");

    expect(response.status).toBe(500);
  });
});

describe("POST /api/workflows", () => {
  it("defaults to the shared project", async () => {
    const response = await post({ name: "Deploy alerts" });

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Deploy alerts", projectId: "shared" }),
    });
  });

  it("uses the requested project", async () => {
    await post({ name: "Deploy alerts", projectId: "proj-1" });

    expect(mocks.getProject).toHaveBeenCalledWith("proj-1");
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ projectId: "proj-1" }),
    });
  });

  it("rejects an unknown project", async () => {
    mocks.getProject.mockResolvedValue(null);

    const response = await post({ name: "Deploy alerts", projectId: "ghost" });

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns 500 when the insert fails", async () => {
    mocks.create.mockRejectedValue(new Error("db down"));

    const response = await post({ name: "Deploy alerts" });

    expect(response.status).toBe(500);
  });
});
