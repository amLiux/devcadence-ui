import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

export function validateSchema(
  schema: unknown,
  data: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  if (!schema || typeof schema !== "object") {
    return { valid: true };
  }
  const validate = ajv.compile(schema as object);
  const valid = validate(data);
  if (valid) return { valid: true };
  const errors = validate.errors?.map((e) => `${e.instancePath || "payload"} ${e.message}`) || ["Invalid payload"];
  return { valid: false, errors };
}

export function inferSchemaFromValue(value: unknown): unknown {
  if (value === null) return { type: "null" };
  if (typeof value === "string") return { type: "string" };
  if (typeof value === "number") return { type: Number.isInteger(value) ? "integer" : "number" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (Array.isArray(value)) {
    const items = value.length > 0 ? inferSchemaFromValue(value[0]) : {};
    return { type: "array", items };
  }
  if (typeof value === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      properties[key] = inferSchemaFromValue(val);
      required.push(key);
    }
    return { type: "object", properties, required };
  }
  return {};
}

export function inferSchemaFromPayload(payload: unknown): string {
  const schema = inferSchemaFromValue(payload);
  return JSON.stringify(schema, null, 2);
}
