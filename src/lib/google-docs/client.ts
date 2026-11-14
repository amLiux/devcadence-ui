import { googleFetch } from "@/lib/google/token";
import { failGoogleRequest } from "@/lib/google/errors";

const DOCS = "https://docs.googleapis.com/v1/documents";

export interface GoogleDoc {
  documentId: string;
  title: string;
  text: string;
  revisionId: string;
  documentUrl: string;
}

interface DocBody {
  content?: { paragraph?: { elements?: { textRun?: { content?: string } }[] } }[];
}

interface RawDocument {
  documentId?: string;
  title?: string;
  revisionId?: string;
  body?: DocBody;
}

function extractText(body: DocBody | undefined): string {
  const paragraphs = body?.content ?? [];
  return paragraphs
    .map((item) =>
      (item.paragraph?.elements ?? [])
        .map((element) => element.textRun?.content ?? "")
        .join(""),
    )
    .join("");
}

function toDoc(raw: RawDocument): GoogleDoc {
  const documentId = raw.documentId ?? "";
  return {
    documentId,
    title: raw.title ?? "",
    text: extractText(raw.body),
    revisionId: raw.revisionId ?? "",
    documentUrl: documentId ? `https://docs.google.com/document/d/${documentId}/edit` : "",
  };
}

export async function createDocument(title: string): Promise<GoogleDoc> {
  const response = await googleFetch(DOCS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    await failGoogleRequest(response, "Docs", "Reconnect with the Docs service selected.");
  }
  return toDoc((await response.json()) as RawDocument);
}

export async function getDocument(documentId: string): Promise<GoogleDoc> {
  const response = await googleFetch(`${DOCS}/${encodeURIComponent(documentId)}`);
  if (!response.ok) {
    await failGoogleRequest(response, "Docs", "Reconnect with the Docs service selected.");
  }
  return toDoc((await response.json()) as RawDocument);
}

interface RawDocumentWithEnd extends RawDocument {
  body?: DocBody & { content?: { endIndex?: number }[] };
}

/** Appends text at the end of the document body. */
export async function appendText(input: {
  documentId: string;
  text: string;
}): Promise<GoogleDoc> {
  const current = await googleFetch(`${DOCS}/${encodeURIComponent(input.documentId)}`);
  if (!current.ok) {
    await failGoogleRequest(current, "Docs", "Reconnect with the Docs service selected.");
  }
  const doc = (await current.json()) as RawDocumentWithEnd;
  const content = doc.body?.content ?? [];
  const lastIndex = content[content.length - 1]?.endIndex ?? 1;
  const insertAt = Math.max(lastIndex - 1, 1);

  const response = await googleFetch(
    `${DOCS}/${encodeURIComponent(input.documentId)}:batchUpdate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: insertAt }, text: input.text } }],
      }),
    },
  );
  if (!response.ok) {
    await failGoogleRequest(response, "Docs", "Reconnect with the Docs service selected.");
  }

  const updated = await getDocument(input.documentId);
  return updated;
}
