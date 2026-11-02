import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    workflow: { findMany: mocks.findMany },
  },
}));

function get(query = "") {
  return GET(new Request(`http://localhost/api/workflows${query}`));
}

const row = {
  id: "wf-1",
  name: "Deploy alerts",
  description: "notify",
  type: "sub-workflow",
  nodes: "[]",
  edges: "[]",
  flowPath: null,
  status: "draft",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.findMany.mockResolvedValue([row]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/workflows", () => {
  it("returns the full workflows by default", async () => {
    const response = await get("?type=sub-workflow");
    const body = await response.json();

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { type: "sub-workflow" },
      orderBy: { updatedAt: "desc" },
    });
    expect(body.workflows[0]).toMatchObject({ id: "wf-1", nodes: "[]", edges: "[]" });
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

  it("omits the type filter when it is not provided", async () => {
    await get("?compact=1");

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: undefined,
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
