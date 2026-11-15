/** Reads the Input node contract of a reusable workflow and edits the mapping JSON. */

export interface InputField {
  name: string;
  defaultValue: string;
}

interface NodeLike {
  data?: {
    title?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * The Input node declares its fields as inputName_<n> / inputDefault_<n>.
 * Empty and duplicate names are skipped, and order follows the index.
 */
export function extractInputContract(nodesJson: string | null | undefined): InputField[] {
  if (!nodesJson) return [];

  try {
    const nodes = JSON.parse(nodesJson) as NodeLike[];
    if (!Array.isArray(nodes)) return [];

    const inputNode = nodes.find((node) => node.data?.title === "Input");
    const metadata = inputNode?.data?.metadata;
    if (!metadata) return [];

    const indices = Object.keys(metadata)
      .filter((key) => /^inputName_\d+$/.test(key))
      .map((key) => Number(key.replace("inputName_", "")))
      .filter((index) => Number.isFinite(index))
      .sort((a, b) => a - b);

    const seen = new Set<string>();
    const fields: InputField[] = [];
    for (const index of indices) {
      const raw = metadata[`inputName_${index}`];
      const name = typeof raw === "string" ? raw.trim() : "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const fallback = metadata[`inputDefault_${index}`];
      fields.push({ name, defaultValue: typeof fallback === "string" ? fallback : "" });
    }
    return fields;
  } catch {
    return [];
  }
}

export function isInputMappingObject(json: string): boolean {
  if (!json.trim()) return true;
  try {
    const parsed = JSON.parse(json);
    return Boolean(parsed) && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function readInputMapping(json: string): Record<string, string> {
  if (!json.trim()) return {};
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
    );
  } catch {
    return {};
  }
}

/** Empty values are removed so the child workflow falls back to its default. */
export function setInputMappingValue(json: string, name: string, value: string): string {
  const mapping = readInputMapping(json);
  if (value.trim() === "") {
    delete mapping[name];
  } else {
    mapping[name] = value;
  }
  return JSON.stringify(mapping, null, 2);
}
