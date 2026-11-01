import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { getConnections, createConnection } from "@/lib/db/connections";

vi.mock("@/lib/db/connections", () => ({
  getConnections: vi.fn(),
  createConnection: vi.fn(),
}));

const getConnectionsMock = vi.mocked(getConnections);
const createConnectionMock = vi.mocked(createConnection);

function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    type: "Slack",
    name: "Team Slack",
    description: "main channel",
    config: { botToken: "xoxb" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getConnectionsMock.mockReset();
  createConnectionMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/connections", () => {
  it("serializes connections with ISO timestamps", async () => {
    getConnectionsMock.mockResolvedValue([dbRow()] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      {
        id: "conn-1",
        type: "Slack",
        name: "Team Slack",
        description: "main channel",
        config: { botToken: "xoxb" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ]);
  });

  it("returns 500 when the query fails", async () => {
    getConnectionsMock.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch connections" });
  });
});

describe("POST /api/connections", () => {
  it("rejects a payload without type", async () => {
    const response = await POST(postRequest({ name: "No type" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "type and name are required" });
    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it("rejects a payload without name", async () => {
    const response = await POST(postRequest({ type: "Slack" }));

    expect(response.status).toBe(400);
    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it("creates a connection and returns 201", async () => {
    createConnectionMock.mockResolvedValue(dbRow() as never);

    const response = await POST(
      postRequest({ type: "Slack", name: "Team Slack", description: "main channel", config: { botToken: "xoxb" } }),
    );

    expect(createConnectionMock).toHaveBeenCalledWith({
      type: "Slack",
      name: "Team Slack",
      description: "main channel",
      config: { botToken: "xoxb" },
    });
    expect(response.status).toBe(201);
    expect((await response.json()).id).toBe("conn-1");
  });

  it("defaults config to an empty object", async () => {
    createConnectionMock.mockResolvedValue(dbRow({ config: {} }) as never);

    await POST(postRequest({ type: "Webhook", name: "Hooks" }));

    expect(createConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ config: {} }),
    );
  });

  it("returns 500 with the error message when creation fails", async () => {
    createConnectionMock.mockRejectedValue(new Error("unique constraint"));

    const response = await POST(postRequest({ type: "Slack", name: "Dup" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "unique constraint" });
  });
});
