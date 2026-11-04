import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectForm } from "./project-form";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProjectForm", () => {
  it("submits trimmed values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProjectForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Name"), "  devcadence-ui  ");
    await userEvent.type(screen.getByLabelText("Description"), "  The dashboard  ");
    await userEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "devcadence-ui",
      description: "The dashboard",
    });
  });

  it("blocks a blank name", async () => {
    const onSubmit = vi.fn();
    render(<ProjectForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the error when creation fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Name is already taken"));
    render(<ProjectForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Name"), "duplicate");
    await userEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is already taken");
  });
});
