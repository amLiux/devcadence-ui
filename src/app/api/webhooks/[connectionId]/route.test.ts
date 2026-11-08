import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getConfig: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { connection: { findUnique: mocks.findUnique } },
}));

vi.mock("@/lib/connection-config", () => ({
  getConnectionConfigById: mocks.getConfig,
}));

vi.mock("@/lib/workflows/execute-webhook", () => ({
  executeWebhook: mocks.execute,
}));

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/webhooks/conn-1", {
      method: "POST",
      body,
    }),
    { params: Promise.resolve({ connectionId: "conn-1" }) },
  );
}

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.getConfig.mockReset();
  mocks.execute.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.findUnique.mockResolvedValue({ id: "conn-1", type: "Webhook" });
  mocks.getConfig.mockResolvedValue({});
  mocks.execute.mockResolvedValue({ status: 200, payload: { success: true } });
});

describe("POST /api/webhooks/[connectionId]", () => {
  it("rejects malformed JSON", async () => {
    expect((await post("{")).status).toBe(400);
  });

  it("accepts an arbitrary JSON payload", async () => {
    const response = await post(JSON.stringify({ event: "push" }));

    expect(response.status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledWith("conn-1", { event: "push" });
  });
});
