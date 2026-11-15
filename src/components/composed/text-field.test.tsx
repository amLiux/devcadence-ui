import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "./text-field";

const user = userEvent.setup();

describe("TextField", () => {
  it("renders the label, value and optional marker", () => {
    render(<TextField label="Calendar ID" value="primary" onChange={vi.fn()} optional />);

    expect(screen.getByLabelText(/Calendar ID/)).toHaveValue("primary");
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  it("reports edits as plain values", async () => {
    const onChange = vi.fn();
    render(<TextField label="Summary" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText("Summary"), "Sync");

    expect(onChange).toHaveBeenCalledWith("S");
    expect(onChange).toHaveBeenLastCalledWith("c");
  });

  it("shows the hint", () => {
    render(<TextField label="Query" value="" onChange={vi.fn()} hint="Gmail search syntax" />);
    expect(screen.getByText("Gmail search syntax")).toBeInTheDocument();
  });
});
