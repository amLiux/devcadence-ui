import { listFiles, uploadFile } from "@/lib/google-drive/client";
import { resolveTemplates } from "@/lib/workflow-context";
import type { ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

const now = () => new Date().toISOString();

type Log = { type: "info" | "success" | "error"; message: string; timestamp: string };

function failure(message: string, logs: Log[]): NodeHandlerResult {
  logs.push({ type: "error", message, timestamp: now() });
  return { success: false, message, logs };
}

export async function handleUploadFile(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const name = resolveTemplates(meta.fileName || "", ancestorChain).trim();
  const content = resolveTemplates(meta.content || "", ancestorChain);

  if (!name) return failure("File name is required", logs);
  if (!content) return failure("File content is required", logs);

  try {
    logs.push({ type: "info", message: `Uploading ${name} to Drive`, timestamp: now() });
    const file = await uploadFile({
      name,
      content,
      mimeType: meta.mimeType || undefined,
      folderId: meta.folderId || undefined,
      convertToGoogleDoc: meta.convertToGoogleDoc === "true",
    });
    logs.push({ type: "success", message: `Uploaded ${file.name}`, timestamp: now() });
    return { success: true, message: `Uploaded ${file.name}`, data: { file }, logs };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to upload file", logs);
  }
}

export async function handleListFiles(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const query = meta.query ? resolveTemplates(meta.query, ancestorChain) : undefined;
  const folderId = meta.folderId || undefined;
  const pageSize = Number.parseInt(meta.pageSize || "20", 10);

  try {
    logs.push({ type: "info", message: "Listing Drive files", timestamp: now() });
    const files = await listFiles({
      query,
      folderId,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });
    logs.push({
      type: "success",
      message: `Found ${files.length} file${files.length === 1 ? "" : "s"}`,
      timestamp: now(),
    });
    return {
      success: true,
      message: `Found ${files.length} files`,
      data: { files, count: files.length },
      logs,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to list files", logs);
  }
}
