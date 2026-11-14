import { beforeEach, describe, expect, it, vi } from "vitest";
import { googleFetch } from "@/lib/google/token";
import { listFiles, uploadFile } from "./client";

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

describe("listFiles", () => {
  it("escapes the name filter and excludes trashed files", async () => {
    fetchMock.mockResolvedValue(json({ files: [{ id: "f1", name: "a.csv" }] }));

    const files = await listFiles({ query: "O'Hara", pageSize: 5 });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toContain("trashed = false");
    expect(url.searchParams.get("q")).toContain("name contains 'O\\'Hara'");
    expect(url.searchParams.get("pageSize")).toBe("5");
    expect(files[0]).toMatchObject({ id: "f1", name: "a.csv" });
  });
});

describe("uploadFile", () => {
  it("sends a multipart body with metadata and media", async () => {
    fetchMock.mockResolvedValue(json({ id: "new", name: "report.csv" }));

    const file = await uploadFile({ name: "report.csv", content: "a,b", mimeType: "text/csv" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = String(init.body);

    expect(String(fetchMock.mock.calls[0][0])).toContain("uploadType=multipart");
    expect(body).toContain('"name":"report.csv"');
    expect(body).toContain("Content-Type: text/csv");
    expect(body).toContain("a,b");
    expect(file.name).toBe("report.csv");
  });

  it("maps 403 to a reconnect hint", async () => {
    fetchMock.mockResolvedValue(json({}, 403));
    await expect(uploadFile({ name: "x", content: "y" })).rejects.toThrow(/Drive permission denied/);
  });
});
