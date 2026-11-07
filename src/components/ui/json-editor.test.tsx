import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonEditor } from "./json-editor";

describe("JsonEditor component", () => {
  it("renders with placeholder and value", () => {
    render(<JsonEditor value='{"foo":"bar"}' onChange={vi.fn()} placeholder="Enter JSON here" />);

    const textarea = screen.getByPlaceholderText("Enter JSON here");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('{"foo":"bar"}');
  });

  it("calls onChange when typing into the editor", async () => {
    const handleChange = vi.fn();
    render(<JsonEditor value="" onChange={handleChange} placeholder="Enter JSON" />);

    const textarea = screen.getByPlaceholderText("Enter JSON");
    await userEvent.type(textarea, "hello");

    expect(handleChange).toHaveBeenCalled();
  });

  it("displays error message and highlights border when error prop is passed", () => {
    render(<JsonEditor value="bad" onChange={vi.fn()} error="Syntax error in JSON" />);

    expect(screen.getByText("Syntax error in JSON")).toBeInTheDocument();
    const wrapper = screen.getByText("Syntax error in JSON").previousElementSibling;
    expect(wrapper?.className).toContain("border-red-500");
  });
});
