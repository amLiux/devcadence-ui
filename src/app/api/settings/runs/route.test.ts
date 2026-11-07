import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  loadRetryPolicy: vi.fn(),
  saveRetryPolicy: vi.fn(),
}));

vi.mock("@/lib/workflows/retry-store", () => ({
  loadRetryPolicy: mocks.loadRetryPolicy,
  saveRetryPolicy: mocks.saveRetryPolicy,
}));

function put(body: unknown) {
  return PUT(
    new Request("http://localhost/api/settings/runs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const valid = {
  enabled: true,
  maxAttempts: 3,
  baseDelayMs: 2_000,
  manualCooldownMs: 30_000,
  maxChain: 10,
};

beforeEach(() => {
  mocks.loadRetryPolicy.mockReset();
  mocks.saveRetryPolicy.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.loadRetryPolicy.mockResolvedValue(valid);
  mocks.saveRetryPolicy.mockImplementation(async (policy) => policy);
});

describe("GET /api/settings/runs", () => {
  it("returns the stored policy", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(valid);
  });

  it("returns 500 when the query fails", async () => {
    mocks.loadRetryPolicy.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});

describe("PUT /api/settings/runs", () => {
  it("rejects an invalid payload", async () => {
    const response = await put({ ...valid, maxAttempts: 11 });

    expect(response.status).toBe(400);
    expect(mocks.saveRetryPolicy).not.toHaveBeenCalled();
  });

  it("rejects a negative delay", async () => {
    const response = await put({ ...valid, baseDelayMs: -1 });

    expect(response.status).toBe(400);
    expect(mocks.saveRetryPolicy).not.toHaveBeenCalled();
  });

  it("saves a valid payload", async () => {
    const response = await put({ ...valid, maxAttempts: 5 });

    expect(response.status).toBe(200);
    expect(mocks.saveRetryPolicy).toHaveBeenCalledWith({ ...valid, maxAttempts: 5 });
  });
});
