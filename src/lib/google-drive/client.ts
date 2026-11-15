import { googleFetch } from "@/lib/google/token";
import { failGoogleRequest } from "@/lib/google/errors";

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

interface RawFile {
  id?: string;
  name?: string;
  mimeType?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

function toFile(raw: RawFile): DriveFile {
  return {
    id: raw.id ?? "",
    name: raw.name ?? "",
    mimeType: raw.mimeType ?? "",
    modifiedTime: raw.modifiedTime ?? "",
    webViewLink: raw.webViewLink ?? "",
  };
}

const FILE_FIELDS = "files(id,name,mimeType,modifiedTime,webViewLink)";

export async function listFiles(input: {
  query?: string;
  folderId?: string;
  pageSize?: number;
}): Promise<DriveFile[]> {
  const filters: string[] = ["trashed = false"];
  if (input.folderId) filters.push(`'${input.folderId}' in parents`);
  if (input.query) filters.push(`name contains '${input.query.replace(/'/g, "\\'")}'`);

  const params = new URLSearchParams({
    q: filters.join(" and "),
    fields: FILE_FIELDS,
    pageSize: String(Math.min(Math.max(input.pageSize ?? 20, 1), 100)),
    orderBy: "modifiedTime desc",
  });

  const response = await googleFetch(`${DRIVE}/files?${params.toString()}`);
  if (!response.ok) {
    await failGoogleRequest(response, "Drive", "Reconnect with the Drive service selected.");
  }
  const body = (await response.json()) as { files?: RawFile[] };
  return (body.files ?? []).map(toFile);
}

/**
 * Multipart upload: metadata + media in one request. `drive.file` covers files
 * created by the app, which is why listing arbitrary user files needs a query
 * scoped to what the app can see.
 */
export async function uploadFile(input: {
  name: string;
  content: string;
  mimeType?: string;
  folderId?: string;
  convertToGoogleDoc?: boolean;
}): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name: input.name,
    ...(input.folderId ? { parents: [input.folderId] } : {}),
    ...(input.convertToGoogleDoc ? { mimeType: "application/vnd.google-apps.document" } : {}),
  };

  const boundary = `devcadence-${Date.now()}`;
  const mediaType = input.mimeType || "text/plain";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mediaType}`,
    "",
    input.content,
    `--${boundary}--`,
  ].join("\r\n");

  const params = new URLSearchParams({ uploadType: "multipart", fields: "id,name,mimeType,modifiedTime,webViewLink" });
  const response = await googleFetch(`${UPLOAD}/files?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!response.ok) {
    await failGoogleRequest(response, "Drive", "Reconnect with the Drive service selected.");
  }
  return toFile((await response.json()) as RawFile);
}
