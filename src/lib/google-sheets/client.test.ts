import { beforeEach, describe, expect, it, vi } from "vitest";
import { googleFetch } from "@/lib/google/token";
import { appendRows, readRows } from "./client";

vi.mock("@/lib/google/token", () => ({ googleFetch: vi.fn() }));

const fetchMock = vi.mocked(googleFetch);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("readRows", () => {
  it("normalizes cells to strings", async () => {
    fetchMock.mockResolvedValue(json({ range: "Sheet1!A1:B2", values: [["a", 1], [null, true]] }));

    const result = await readRows({ spreadsheetId: "sheet-1", range: "Sheet1!A1:B2" });

    expect(result.rows).toEqual([["a", "1"], ["", "true"]]);
    expect(result.rowCount).toBe(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/spreadsheets/sheet-1/values/");
  });

  it("returns an empty array for an empty range", async () => {
    fetchMock.mockResolvedValue(json({}));
    await expect(readRows({ spreadsheetId: "s", range: "A1:B2" })).resolves.toMatchObject({
      rows: [],
      rowCount: 0,
    });
  });
});

describe("appendRows", () => {
  it("posts values with USER_ENTERED and returns the updated range", async () => {
    fetchMock.mockResolvedValue(json({ updates: { updatedRange: "Sheet1!A2:B2", updatedRows: 1 } }));

    const result = await appendRows({
      spreadsheetId: "sheet-1",
      range: "Sheet1!A1",
      rows: [["a", "b"]],
    });

    const url = String(fetchMock.mock.calls[0][0]);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(url).toContain("valueInputOption=USER_ENTERED");
    expect(JSON.parse(String(init.body))).toEqual({ values: [["a", "b"]] });
    expect(result).toEqual({ updatedRange: "Sheet1!A2:B2", updatedRows: 1 });
  });
});
