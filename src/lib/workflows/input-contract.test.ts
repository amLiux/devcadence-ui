import { describe, expect, it } from "vitest";
import {
  extractInputContract,
  isInputMappingObject,
  readInputMapping,
  setInputMappingValue,
} from "./input-contract";

function nodes(inputMetadata: Record<string, unknown> | null): string {
  const list = [
    { data: { title: "HTTP Request", metadata: {} } },
    ...(inputMetadata ? [{ data: { title: "Input", metadata: inputMetadata } }] : []),
  ];
  return JSON.stringify(list);
}

describe("extractInputContract", () => {
  it("reads names and defaults in index order, skipping empty and duplicate names", () => {
    const fields = extractInputContract(
      nodes({
        inputName_1: "city",
        inputDefault_1: "San José",
        inputName_2: "token",
        inputDefault_2: "",
        inputName_3: "  ",
        inputName_4: "city",
        inputName_5: "count",
      }),
    );

    expect(fields).toEqual([
      { name: "city", defaultValue: "San José" },
      { name: "token", defaultValue: "" },
      { name: "count", defaultValue: "" },
    ]);
  });

  it("returns nothing without an Input node or valid JSON", () => {
    expect(extractInputContract(nodes(null))).toEqual([]);
    expect(extractInputContract(null)).toEqual([]);
    expect(extractInputContract("not json")).toEqual([]);
    expect(extractInputContract("{}")).toEqual([]);
  });
});

describe("readInputMapping / setInputMappingValue", () => {
  it("reads a mapping and stringifies non-string values", () => {
    expect(readInputMapping('{"a":"x","b":2}')).toEqual({ a: "x", b: "2" });
    expect(readInputMapping("not json")).toEqual({});
    expect(readInputMapping("[1,2]")).toEqual({});
  });

  it("sets a value preserving the other keys", () => {
    const next = setInputMappingValue('{"a":"x"}', "b", "y");
    expect(JSON.parse(next)).toEqual({ a: "x", b: "y" });
  });

  it("removes a key when the value is empty so the default can apply", () => {
    const next = setInputMappingValue('{"a":"x","b":"y"}', "b", "  ");
    expect(JSON.parse(next)).toEqual({ a: "x" });
  });

  it("starts from an empty object when the JSON is invalid", () => {
    const next = setInputMappingValue("{broken", "a", "1");
    expect(JSON.parse(next)).toEqual({ a: "1" });
  });
});

describe("isInputMappingObject", () => {
  it("accepts empty and object JSON", () => {
    expect(isInputMappingObject("")).toBe(true);
    expect(isInputMappingObject("{}")).toBe(true);
    expect(isInputMappingObject('{"a":1}')).toBe(true);
  });

  it("rejects arrays, scalars and invalid JSON", () => {
    expect(isInputMappingObject("[]")).toBe(false);
    expect(isInputMappingObject("42")).toBe(false);
    expect(isInputMappingObject("{broken")).toBe(false);
  });
});
