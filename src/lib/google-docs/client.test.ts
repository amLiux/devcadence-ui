import { beforeEach, describe, expect, it, vi } from "vitest";
import { googleFetch } from "@/lib/google/token";
import { appendText, createDocument, getDocument } from "./client";

vi.mock("@/lib/google/token", () => ({ googleFetch: vi.fn() }));

const fetchMock = vi.mocked(googleFetch);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const doc = (text: string, endIndex = text.length + 2) => ({
  documentId: "doc-1",
  title: "Report",
  revisionId: "rev-1",
  body: {
    content: [
      { paragraph: { elements: [{ textRun: { content: text } }] }, endIndex },
    ],
  },
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe("createDocument", () => {
  it("creates the doc and builds the URL", async () => {
    fetchMock.mockResolvedValue(json(doc("hello\n")));

    const result = await createDocument("Report");

    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({
      title: "Report",
    });
    expect(result.documentUrl).toBe("https://docs.google.com/document/d/doc-1/edit");
    expect(result.text).toBe("hello\n");
  });
});

describe("getDocument", () => {
  it("concatenates paragraph text runs", async () => {
    fetchMock.mockResolvedValue(
      json({
        documentId: "doc-1",
        title: "Notes",
        body: {
          content: [
            { paragraph: { elements: [{ textRun: { content: "line 1\n" } }] }, endIndex: 8 },
            { paragraph: { elements: [{ textRun: { content: "line 2" } }] }, endIndex: 14 },
          ],
        },
      }),
    );

    const result = await getDocument("doc-1");
    expect(result.text).toBe("line 1\nline 2");
  });
});

describe("appendText", () => {
  it("inserts before the final newline and returns the updated doc", async () => {
    fetchMock
      .mockResolvedValueOnce(json(doc("existing\n", 10)))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(json(doc("existing\nnew\n", 14)));

    const result = await appendText({ documentId: "doc-1", text: "new\n" });

    const batchUrl = String(fetchMock.mock.calls[1][0]);
    const payload = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(batchUrl).toContain(":batchUpdate");
    expect(payload.requests[0].insertText.location.index).toBe(9);
    expect(result.text).toContain("new");
  });
});
