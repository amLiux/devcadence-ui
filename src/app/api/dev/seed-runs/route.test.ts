import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { workflow: { findUnique: mocks.findUnique } },
}));

function post(body: string): Promise<Response> {
  return POST(new Request("http://localhost/api/dev/seed-runs", { method: "POST", body }));
}

beforeEach(() => {
  mocks.findUnique.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.findUnique.mockResolvedValue({ id: "wf-1" });
});

describe("POST /api/dev/seed-runs", () => {
  it("rejects malformed JSON", async () => {
    expect((await post("{")).status).toBe(400);
  });

  it("rejects a missing workflowId", async () => {
    const response = await post("{}");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("workflowId");
  });
});
