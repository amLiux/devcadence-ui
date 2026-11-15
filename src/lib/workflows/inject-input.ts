import type { EditorNode } from "@/lib/types";

function serialize(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Copies the Call Workflow input into the child Input node.
 *
 * Mapping is by field name, not by the order of the incoming object: two
 * Call Workflow nodes can pass the same keys in a different order, and the
 * child's Input node exposes them as input_<index> based on inputName_<index>.
 * Ignoring the keys shifted every value by one field.
 */
export function injectInput(nodes: EditorNode[], input: Record<string, unknown>): void {
  const inputNode = nodes.find((node) => node.data.title === "Input");
  if (!inputNode) return;

  const metadata = (inputNode.data.metadata || {}) as Record<string, string>;
  const indexByName = new Map<string, number>();

  for (const key of Object.keys(metadata)) {
    if (!key.startsWith("inputName_")) continue;
    const index = Number(key.replace("inputName_", ""));
    const name = typeof metadata[key] === "string" ? metadata[key].trim() : "";
    if (name && Number.isFinite(index)) indexByName.set(name, index);
  }

  if (indexByName.size === 0) {
    // No declared names: fall back to positional mapping for legacy workflows.
    Object.values(input).forEach((value, position) => {
      metadata[`input_${position + 1}`] = serialize(value);
    });
    inputNode.data.metadata = metadata;
    return;
  }

  for (const [name, value] of Object.entries(input)) {
    const index = indexByName.get(name);
    if (!index) continue;
    metadata[`input_${index}`] = serialize(value);
  }
  inputNode.data.metadata = metadata;
}
