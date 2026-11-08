import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { aIContext: { create: mocks.create } },
}));

function post(body: string): Promise<Response> {
  return POST(new Request("http://localhost/api/ai/context", { method: "POST", body }));
}

beforeEach(() => {
  mocks.create.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.create.mockResolvedValue({ id: "ctx-1", name: "Docs", content: "Body", description: "" });
});

describe("POST /api/ai/context", () => {
  it("rejects malformed JSON", async () => {
    expect((await post("{")).status).toBe(400);
  });

  it("rejects a missing content", async () => {
    const response = await post(JSON.stringify({ name: "Docs" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("content");
  });

  it("rejects a wrong type", async () => {
    expect((await post(JSON.stringify({ name: "Docs", content: 42 }))).status).toBe(400);
  });

  it("creates a context from a valid payload", async () => {
    const response = await post(JSON.stringify({ name: "Docs", content: "Body" }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: { name: "Docs", content: "Body", description: "" },
    });
  });
});
