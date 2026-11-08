import { describe, it, expect } from "vitest";
import { z } from "zod";
import { readJsonBody } from "./body";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  count: z.number().int().optional(),
});

function request(body: string): Request {
  return new Request("http://localhost/api/test", { method: "POST", body });
}

describe("readJsonBody", () => {
  it("returns typed data for a valid body", async () => {
    const result = await readJsonBody(request('{"name":"demo","count":2}'), schema);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ name: "demo", count: 2 });
  });

  it("returns 400 for malformed JSON", async () => {
    const result = await readJsonBody(request("{"), schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect((await result.response.json()).error).toContain("Invalid JSON");
    }
  });

  it("returns 400 for a wrong field type", async () => {
    const result = await readJsonBody(request('{"name":42}'), schema);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("returns 400 for a missing required field", async () => {
    const result = await readJsonBody(request("{}"), schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect((await result.response.json()).error).toContain("name");
    }
  });
});
