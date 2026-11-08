import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "./route";
import { syncSchedules, unregisterSchedule } from "@/lib/scheduler";
import { recordVersion } from "@/lib/workflows/version-store";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  getProject: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    workflow: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/scheduler", () => ({
  syncSchedules: vi.fn(),
  unregisterSchedule: vi.fn(),
}));

vi.mock("@/lib/workflows/version-store", () => ({
  recordVersion: vi.fn(),
}));

vi.mock("@/lib/db/projects", () => ({
  getProject: mocks.getProject,
}));

const recordVersionMock = vi.mocked(recordVersion);

function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf-123",
    name: "Deploy Automation",
    description: "Triggers on webhook",
    type: "workflow",
    projectId: "shared",
    nodes: "[]",
    edges: "[]",
    flowPath: null,
    status: "draft",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/workflows/wf-123", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function callPut(body: unknown) {
  return PUT(putRequest(body), { params: Promise.resolve({ id: "wf-123" }) });
}

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.update.mockReset();
  mocks.transaction.mockReset();
  mocks.getProject.mockReset();
  mocks.getProject.mockResolvedValue({ id: "proj-1" });
  recordVersionMock.mockReset();
  vi.mocked(syncSchedules).mockReset();
  vi.mocked(unregisterSchedule).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.findUnique.mockResolvedValue(dbRow());
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ workflow: { update: mocks.update } }),
  );
});

describe("PUT /api/workflows/[id]", () => {
  it("rejects a blank name without touching the database", async () => {
    const response = await callPut({ name: "   " });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "name: Name is required" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a non-string name", async () => {
    const response = await callPut({ name: 42 });

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the workflow does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await callPut({ name: "Renamed" });

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("stores a version of the previous state before updating", async () => {
    mocks.update.mockResolvedValue(dbRow({ name: "Renamed" }));

    await callPut({ name: "Renamed" });

    expect(recordVersionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "wf-123", name: "Deploy Automation" }),
      expect.objectContaining({ id: "wf-123", name: "Renamed" }),
      "save",
    );
  });

  it("trims the name before updating", async () => {
    mocks.update.mockResolvedValue(dbRow({ name: "Renamed" }));

    const response = await callPut({ name: "  Renamed  " });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "wf-123" },
      data: { name: "Renamed" },
    });
    expect(response.status).toBe(200);
  });

  it("updates name and description and returns the serialized workflow", async () => {
    mocks.update.mockResolvedValue(dbRow({ name: "Renamed", description: "New description" }));

    const response = await callPut({ name: "Renamed", description: "New description" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "wf-123",
      name: "Renamed",
      description: "New description",
      type: "workflow",
      projectId: "shared",
      nodes: "[]",
      edges: "[]",
      flowPath: null,
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("moves the workflow to another project", async () => {
    mocks.update.mockResolvedValue(dbRow({ projectId: "proj-1" }));

    const response = await callPut({ projectId: "proj-1" });

    expect(mocks.getProject).toHaveBeenCalledWith("proj-1");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "wf-123" },
      data: { projectId: "proj-1" },
    });
    expect(response.status).toBe(200);
  });

  it("rejects a move to an unknown project", async () => {
    mocks.getProject.mockResolvedValue(null);

    const response = await callPut({ projectId: "ghost" });

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not touch schedules when only metadata changes", async () => {
    mocks.update.mockResolvedValue(dbRow());

    await callPut({ name: "Renamed" });

    expect(syncSchedules).not.toHaveBeenCalled();
    expect(unregisterSchedule).not.toHaveBeenCalled();
  });

  it("returns 500 with the error message when the update fails", async () => {
    mocks.update.mockRejectedValue(new Error("Record not found"));

    const response = await callPut({ name: "Renamed" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Record not found" });
  });
});
