import { resolveTemplates } from "@/lib/workflow-context";
import { fetchPublicUrl, readBodyWithLimit } from "../safe-fetch";
import type { NodeHandlerResult } from "./types";

const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

interface PageResult {
  requestedUrl: string;
  finalUrl: string;
  status: number;
}

/** Text from the page with the usual chrome (nav, scripts, forms) removed. */
function fallbackText(document: Document): string {
  const clone = document.cloneNode(true) as Document;
  clone
    .querySelectorAll("script,style,noscript,svg,iframe,nav,header,footer,aside,form")
    .forEach((element) => element.remove());
  return (clone.body?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function pageData(page: PageResult, title: string, text: string) {
  return {
    url: page.finalUrl,
    requestedUrl: page.requestedUrl,
    title,
    text,
    status: page.status,
  };
}

function plainTextResult(body: string, page: PageResult): NodeHandlerResult {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return { success: false, message: "The page has no text" };

  return {
    success: true,
    message: `Scraped ${page.finalUrl} (${text.length} chars)`,
    data: pageData(page, page.finalUrl, text),
  };
}

async function articleResult(body: string, page: PageResult): Promise<NodeHandlerResult> {
  const [{ JSDOM }, { Readability }] = await Promise.all([
    import("jsdom"),
    import("@mozilla/readability"),
  ]);

  const dom = new JSDOM(body, { url: page.finalUrl });
  const article = new Readability(dom.window.document).parse();
  const text = (article?.textContent || fallbackText(dom.window.document))
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return { success: false, message: "No readable content found on the page" };
  }

  const title = article?.title?.trim() || dom.window.document.title?.trim() || page.finalUrl;

  return {
    success: true,
    message: `Scraped ${page.finalUrl} (${text.length} chars)`,
    data: pageData(page, title, text),
  };
}

function isSupportedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.some((type) => contentType.includes(type));
}

/**
 * Handles Scrape nodes: fetches a public URL and extracts its main text.
 *
 * The page is fetched by the server, so the URL guard (SSRF, size, redirects,
 * timeout) lives in `safe-fetch` and is shared with the PDF node.
 */
export async function handleScrape(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const requestedUrl = resolveTemplates(meta.url || "", ancestorChain).trim();
  if (!requestedUrl) {
    return { success: false, message: "URL is required" };
  }

  try {
    const { response, finalUrl } = await fetchPublicUrl(requestedUrl);

    if (!response.ok) {
      return {
        success: false,
        message: `Scrape failed: ${response.status} ${response.statusText}`.trim(),
      };
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!isSupportedContentType(contentType)) {
      return {
        success: false,
        message: `Unsupported content type: ${contentType || "unknown"}`,
      };
    }

    const body = await readBodyWithLimit(response);
    const page: PageResult = { requestedUrl, finalUrl, status: response.status };

    return contentType.includes("text/plain")
      ? plainTextResult(body, page)
      : articleResult(body, page);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Scrape failed",
    };
  }
}
