import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeToggle } from "./mode-toggle";

const mockSetTheme = vi.fn();
let mockTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ModeToggle", () => {
  it("renders the toggle button", () => {
    mockTheme = "light";
    render(<ModeToggle />);

    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("toggles from light to dark when clicked", async () => {
    mockTheme = "light";
    render(<ModeToggle />);

    await userEvent.click(screen.getByRole("button", { name: /toggle theme/i }));

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles from dark to light when clicked", async () => {
    mockTheme = "dark";
    render(<ModeToggle />);

    await userEvent.click(screen.getByRole("button", { name: /toggle theme/i }));

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
