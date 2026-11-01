import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { syncSchedules, unregisterSchedule } from "@/lib/scheduler";

vi.mock("@/lib/db", () => ({
  prisma: { workflow: { update: vi.fn() } },
}));

vi.mock("@/lib/scheduler", () => ({
  syncSchedules: vi.fn(),
  unregisterSchedule: vi.fn(),
}));

const updateMock = vi.mocked(prisma.workflow.update);

function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf-123",
    name: "Deploy Automation",
    description: "Triggers on webhook",
    type: "workflow",
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
  updateMock.mockReset();
  vi.mocked(syncSchedules).mockReset();
  vi.mocked(unregisterSchedule).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PUT /api/workflows/[id]", () => {
  it("rejects a blank name without touching the database", async () => {
    const response = await callPut({ name: "   " });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Name is required" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a non-string name", async () => {
    const response = await callPut({ name: 42 });

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("trims the name before updating", async () => {
    updateMock.mockResolvedValue(dbRow({ name: "Renamed" }) as never);

    const response = await callPut({ name: "  Renamed  " });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "wf-123" },
      data: { name: "Renamed" },
    });
    expect(response.status).toBe(200);
  });

  it("updates name and description and returns the serialized workflow", async () => {
    updateMock.mockResolvedValue(
      dbRow({ name: "Renamed", description: "New description" }) as never,
    );

    const response = await callPut({ name: "Renamed", description: "New description" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "wf-123",
      name: "Renamed",
      description: "New description",
      type: "workflow",
      nodes: "[]",
      edges: "[]",
      flowPath: null,
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("does not touch schedules when only metadata changes", async () => {
    updateMock.mockResolvedValue(dbRow() as never);

    await callPut({ name: "Renamed" });

    expect(syncSchedules).not.toHaveBeenCalled();
    expect(unregisterSchedule).not.toHaveBeenCalled();
  });

  it("returns 500 with the error message when the update fails", async () => {
    updateMock.mockRejectedValue(new Error("Record not found"));

    const response = await callPut({ name: "Renamed" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Record not found" });
  });
});
