/**
 * Upload File sends text content, so the selectable types are text-based.
 * Binary formats (PDF, images, zip) need a different upload path and are out of scope.
 */
export const TEXT_MIME_TYPES = [
  { value: "", label: "Auto (text/plain)" },
  { value: "text/plain", label: "Plain text (.txt)" },
  { value: "text/csv", label: "CSV (.csv)" },
  { value: "text/tab-separated-values", label: "TSV (.tsv)" },
  { value: "text/markdown", label: "Markdown (.md)" },
  { value: "text/html", label: "HTML (.html)" },
  { value: "application/json", label: "JSON (.json)" },
  { value: "application/xml", label: "XML (.xml)" },
] as const;

export const DEFAULT_MIME_TYPE = "text/plain";

export function resolveMimeType(value: string | undefined): string {
  return value && TEXT_MIME_TYPES.some((option) => option.value === value)
    ? value
    : DEFAULT_MIME_TYPE;
}
