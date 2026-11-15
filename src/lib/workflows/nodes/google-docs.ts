import { appendText, createDocument, getDocument } from "@/lib/google-docs/client";
import { resolveTemplates } from "@/lib/workflow-context";
import type { ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

const now = () => new Date().toISOString();

type Log = { type: "info" | "success" | "error"; message: string; timestamp: string };

function failure(message: string, logs: Log[]): NodeHandlerResult {
  logs.push({ type: "error", message, timestamp: now() });
  return { success: false, message, logs };
}

export async function handleCreateDocument(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const title = resolveTemplates(meta.title || "", ancestorChain).trim();
  const initialText = meta.initialText
    ? resolveTemplates(meta.initialText, ancestorChain)
    : "";

  if (!title) return failure("Document title is required", logs);

  try {
    logs.push({ type: "info", message: `Creating document "${title}"`, timestamp: now() });
    const created = await createDocument(title);
    const document = initialText
      ? await appendText({ documentId: created.documentId, text: initialText })
      : created;

    logs.push({ type: "success", message: `Created ${document.documentUrl}`, timestamp: now() });
    return { success: true, message: `Document created: ${document.title}`, data: { document }, logs };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to create document", logs);
  }
}

export async function handleReadDocument(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const documentId = resolveTemplates(meta.documentId || "", ancestorChain).trim();

  if (!documentId) return failure("Document ID is required", logs);

  try {
    logs.push({ type: "info", message: `Reading document ${documentId}`, timestamp: now() });
    const document = await getDocument(documentId);
    logs.push({
      type: "success",
      message: `Read ${document.text.length} characters`,
      timestamp: now(),
    });
    return { success: true, message: `Read "${document.title}"`, data: { document }, logs };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to read document", logs);
  }
}

export async function handleAppendText(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const documentId = resolveTemplates(meta.documentId || "", ancestorChain).trim();
  const text = resolveTemplates(meta.text || "", ancestorChain);

  if (!documentId) return failure("Document ID is required", logs);
  if (!text) return failure("Text is required", logs);

  try {
    logs.push({ type: "info", message: `Appending to ${documentId}`, timestamp: now() });
    const document = await appendText({ documentId, text });
    logs.push({
      type: "success",
      message: `Appended ${text.length} characters`,
      timestamp: now(),
    });
    return { success: true, message: "Text appended", data: { document }, logs };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to append text", logs);
  }
}
