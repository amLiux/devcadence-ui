import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonEditor, formatJson, validateJson } from "./json-editor";

describe("JsonEditor utilities", () => {
  describe("formatJson", () => {
    it("formats valid JSON string with 2 spaces indentation", () => {
      const input = '{"a":1,"b":[2,3]}';
      const output = formatJson(input);
      expect(output).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
    });

    it("returns raw input if JSON is invalid", () => {
      const invalid = '{ "bad": json ';
      expect(formatJson(invalid)).toBe(invalid);
    });
  });

  describe("validateJson", () => {
    it("returns null for empty or whitespace-only strings", () => {
      expect(validateJson("")).toBeNull();
      expect(validateJson("   \n  ")).toBeNull();
    });

    it("returns null for valid JSON", () => {
      expect(validateJson('{"key": "value"}')).toBeNull();
      expect(validateJson("[1, 2, 3]")).toBeNull();
      expect(validateJson('"string"')).toBeNull();
    });

    it("returns error message for invalid JSON", () => {
      const result = validateJson('{"incomplete":');
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
    });
  });
});

describe("JsonEditor component", () => {
  it("renders with placeholder and value", () => {
    render(
      <JsonEditor
        value='{"foo":"bar"}'
        onChange={vi.fn()}
        placeholder="Enter JSON here"
      />
    );

    const textarea = screen.getByPlaceholderText("Enter JSON here");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('{"foo":"bar"}');
  });

  it("calls onChange when typing into the editor", async () => {
    const handleChange = vi.fn();
    render(
      <JsonEditor
        value=""
        onChange={handleChange}
        placeholder="Enter JSON"
      />
    );

    const textarea = screen.getByPlaceholderText("Enter JSON");
    await userEvent.type(textarea, "hello");

    expect(handleChange).toHaveBeenCalled();
  });

  it("displays error message and highlights border when error prop is passed", () => {
    render(
      <JsonEditor
        value="bad"
        onChange={vi.fn()}
        error="Syntax error in JSON"
      />
    );

    expect(screen.getByText("Syntax error in JSON")).toBeInTheDocument();
    const wrapper = screen.getByText("Syntax error in JSON").previousElementSibling;
    expect(wrapper?.className).toContain("border-red-500");
  });
});
