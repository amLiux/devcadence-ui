import { describe, it, expect } from "vitest";
import {
  formatTemplateJson,
  formatTemplateJsonError,
  maskTemplates,
  validateTemplateJson,
} from "./json-input";

describe("maskTemplates", () => {
  it("keeps the original length so error offsets stay valid", () => {
    const input = '{"count": {{count}}, "name": "hi {{user}}"}';
    const masked = maskTemplates(input);
    expect(masked).toHaveLength(input.length);
    expect(masked).not.toContain("{{");
  });
});

describe("validateTemplateJson", () => {
  it("returns null for empty input", () => {
    expect(validateTemplateJson("")).toBeNull();
    expect(validateTemplateJson("  \n ")).toBeNull();
  });

  it("accepts plain JSON", () => {
    expect(validateTemplateJson('{"key": "value"}')).toBeNull();
    expect(validateTemplateJson("[1, 2, 3]")).toBeNull();
  });

  it("accepts templates inside strings", () => {
    expect(validateTemplateJson('{"name": "{{previousStep.name}}"}')).toBeNull();
  });

  it("accepts templates as raw values", () => {
    expect(validateTemplateJson('{"count": {{count}}}')).toBeNull();
    expect(validateTemplateJson("[{{a}}, {{b}}]")).toBeNull();
  });

  it("still rejects broken JSON that contains templates", () => {
    const result = validateTemplateJson('{\n  "count": {{count}},\n  "broken": \n}');
    expect(result).not.toBeNull();
    expect(result?.line).toBe(4);
  });

  it("reports a readable message without the raw position suffix", () => {
    const result = validateTemplateJson('{"a": }');
    expect(result?.message).not.toContain("position");
    expect(result?.message.length).toBeGreaterThan(0);
  });

  it("does not accept a templated key", () => {
    expect(validateTemplateJson("{{{key}}: 1}")).not.toBeNull();
  });
});

describe("formatTemplateJsonError", () => {
  it("includes the location when known", () => {
    const message = formatTemplateJsonError({ message: "Unexpected token }", line: 3, column: 5 });
    expect(message).toBe("Line 3, column 5: Unexpected token }");
  });

  it("omits the location when unknown", () => {
    expect(formatTemplateJsonError({ message: "Invalid JSON", line: null, column: null })).toBe(
      "Invalid JSON",
    );
  });
});

describe("formatTemplateJson", () => {
  it("formats plain JSON with two spaces", () => {
    expect(formatTemplateJson('{"a":1,"b":[2,3]}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}',
    );
  });

  it("keeps templates inside strings", () => {
    const output = formatTemplateJson('{"name":"hi {{user}}"}');
    expect(output).toBe('{\n  "name": "hi {{user}}"\n}');
  });

  it("keeps templates used as raw values", () => {
    const output = formatTemplateJson('{"count":{{count}},"ok":true}');
    expect(output).toBe('{\n  "count": {{count}},\n  "ok": true\n}');
  });

  it("handles both kinds in the same document", () => {
    const output = formatTemplateJson('{"a":"{{x}}","b":{{y}}}');
    expect(output).toBe('{\n  "a": "{{x}}",\n  "b": {{y}}\n}');
  });

  it("returns the input unchanged when it cannot be parsed", () => {
    const invalid = '{ "bad": json ';
    expect(formatTemplateJson(invalid)).toBe(invalid);
  });

  it("returns empty input untouched", () => {
    expect(formatTemplateJson("   ")).toBe("   ");
  });
});
