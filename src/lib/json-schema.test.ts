import { describe, it, expect } from "vitest";
import { validateSchema, inferSchemaFromValue, inferSchemaFromPayload } from "./json-schema";

describe("validateSchema", () => {
  it("treats a missing schema as valid", () => {
    expect(validateSchema(undefined, { anything: true })).toEqual({ valid: true });
    expect(validateSchema(null, "x")).toEqual({ valid: true });
  });

  it("accepts data matching the schema", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    };

    expect(validateSchema(schema, { name: "devdock" })).toEqual({ valid: true });
  });

  it("returns readable errors for invalid data", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    };

    const result = validateSchema(schema, { name: 42 });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("/name");
    }
  });
});

describe("inferSchemaFromValue", () => {
  it("infers primitive types", () => {
    expect(inferSchemaFromValue("x")).toEqual({ type: "string" });
    expect(inferSchemaFromValue(1)).toEqual({ type: "integer" });
    expect(inferSchemaFromValue(1.5)).toEqual({ type: "number" });
    expect(inferSchemaFromValue(true)).toEqual({ type: "boolean" });
    expect(inferSchemaFromValue(null)).toEqual({ type: "null" });
  });

  it("infers arrays from their first item", () => {
    expect(inferSchemaFromValue([1, 2])).toEqual({ type: "array", items: { type: "integer" } });
    expect(inferSchemaFromValue([])).toEqual({ type: "array", items: {} });
  });

  it("infers object properties as required", () => {
    expect(inferSchemaFromValue({ id: 1, name: "a" })).toEqual({
      type: "object",
      properties: { id: { type: "integer" }, name: { type: "string" } },
      required: ["id", "name"],
    });
  });
});

describe("inferSchemaFromPayload", () => {
  it("returns a pretty-printed JSON schema", () => {
    const result = inferSchemaFromPayload({ ok: true });

    expect(JSON.parse(result)).toEqual({
      type: "object",
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
    });
    expect(result).toContain("\n");
  });
});
