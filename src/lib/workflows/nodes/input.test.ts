import { describe, expect, it } from "vitest";
import { handleInput } from "./input";

describe("handleInput", () => {
  it("keeps ids larger than Number.MAX_SAFE_INTEGER as strings", async () => {
    const result = await handleInput({
      inputName_1: "discordChannelId",
      input_1: "1566642396014448660",
    });

    expect(result.success).toBe(true);
    expect((result.data as Record<string, unknown>).discordChannelId).toBe(
      "1566642396014448660",
    );
  });

  it("still parses safe numbers and JSON", async () => {
    const result = await handleInput({
      inputName_1: "count",
      input_1: "42",
      inputName_2: "payload",
      input_2: '{"a":1}',
    });

    const data = result.data as Record<string, unknown>;
    expect(data.count).toBe(42);
    expect(data.payload).toEqual({ a: 1 });
  });

  it("keeps a plain string untouched", async () => {
    const result = await handleInput({ inputName_1: "message", input_1: "hello" });
    expect((result.data as Record<string, unknown>).message).toBe("hello");
  });
});
