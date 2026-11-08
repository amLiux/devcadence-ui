import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleScrape } from "./scrape";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

const publicAddress = { address: "93.184.216.34", family: 4 };
const fetchMock = vi.fn();

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([publicAddress]);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function htmlResponse(html: string, contentType = "text/html; charset=utf-8") {
  return new Response(html, { status: 200, headers: { "content-type": contentType } });
}

describe("handleScrape", () => {
  it("requires a URL", async () => {
    const result = await handleScrape({}, undefined);

    expect(result).toEqual({ success: false, message: "URL is required" });
  });

  it("extracts the article text and title", async () => {
    fetchMock.mockResolvedValue(
      htmlResponse(`
        <html>
          <head><title>Page title</title></head>
          <body>
            <nav>Menu</nav>
            <article>
              <h1>The heading</h1>
              <p>This is the main content of the article, long enough to survive readability.</p>
            </article>
            <footer>Footer</footer>
          </body>
        </html>
      `),
    );

    const result = await handleScrape({ url: "https://example.com/article" }, undefined);

    expect(result.success).toBe(true);
    expect(result.data.text).toContain("main content of the article");
    expect(result.data.text).not.toContain("Menu");
    expect(result.data.url).toBe("https://example.com/article");
    expect(result.data.title).toBeTruthy();
  });

  it("falls back to the body text when there is no article", async () => {
    fetchMock.mockResolvedValue(
      htmlResponse("<html><body><div>Plain body content</div></body></html>"),
    );

    const result = await handleScrape({ url: "https://example.com/plain" }, undefined);

    expect(result.success).toBe(true);
    expect(result.data.text).toContain("Plain body content");
  });

  it("returns text/plain bodies as-is", async () => {
    fetchMock.mockResolvedValue(
      htmlResponse("hello\n  world", "text/plain; charset=utf-8"),
    );

    const result = await handleScrape({ url: "https://example.com/file.txt" }, undefined);

    expect(result.success).toBe(true);
    expect(result.data.text).toBe("hello world");
  });

  it("rejects private addresses before fetching", async () => {
    const result = await handleScrape({ url: "http://127.0.0.1/admin" }, undefined);

    expect(result).toEqual({ success: false, message: "Private addresses are not allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a redirect that lands on a private address", async () => {
    lookupMock.mockImplementation((host: string) =>
      host === "10.0.0.1"
        ? Promise.resolve([{ address: "10.0.0.1", family: 4 }])
        : Promise.resolve([publicAddress]),
    );
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://10.0.0.1/secret" },
      }),
    );

    const result = await handleScrape({ url: "https://example.com" }, undefined);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Private addresses are not allowed");
  });

  it("rejects unsupported content types", async () => {
    fetchMock.mockResolvedValue(htmlResponse("pdf bytes", "application/pdf"));

    const result = await handleScrape({ url: "https://example.com/paper.pdf" }, undefined);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unsupported content type");
  });

  it("reports non-ok responses", async () => {
    fetchMock.mockResolvedValue(
      new Response("missing", { status: 404, statusText: "Not Found" }),
    );

    const result = await handleScrape({ url: "https://example.com/missing" }, undefined);

    expect(result.success).toBe(false);
    expect(result.message).toContain("404");
  });

  it("rejects bodies over the size cap", async () => {
    fetchMock.mockResolvedValue(htmlResponse("x".repeat(2 * 1024 * 1024 + 1)));

    const result = await handleScrape({ url: "https://example.com/huge" }, undefined);

    expect(result.success).toBe(false);
    expect(result.message).toContain("too large");
  });
});
