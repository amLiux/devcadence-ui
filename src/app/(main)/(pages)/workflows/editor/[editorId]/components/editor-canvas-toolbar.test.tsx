import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorCanvasToolbar } from "./editor-canvas-toolbar";

function renderToolbar(overrides: Partial<React.ComponentProps<typeof EditorCanvasToolbar>> = {}) {
  const props = {
    saving: false,
    running: false,
    nodeCount: 3,
    onSave: vi.fn(),
    onTest: vi.fn(),
    onExport: vi.fn(),
    onVersions: vi.fn(),
    onVariables: vi.fn(),
    ...overrides,
  };

  render(<EditorCanvasToolbar {...props} />);
  return props;
}

describe("EditorCanvasToolbar", () => {
  it("exposes Save and Test as primary actions", async () => {
    const props = renderToolbar();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await userEvent.click(screen.getByRole("button", { name: /test/i }));

    expect(props.onSave).toHaveBeenCalledOnce();
    expect(props.onTest).toHaveBeenCalledOnce();
  });

  it("does not expose secondary actions outside the overflow menu", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /variables/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /versions/i })).not.toBeInTheDocument();
  });

  it("opens the overflow menu with the secondary actions", async () => {
    renderToolbar();

    await userEvent.click(screen.getByRole("button", { name: /more workflow actions/i }));

    expect(await screen.findByRole("menuitem", { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /variables/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /versions/i })).toBeInTheDocument();
  });

  it("runs the secondary actions from the overflow menu", async () => {
    const props = renderToolbar();

    await userEvent.click(screen.getByRole("button", { name: /more workflow actions/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /variables/i }));
    await userEvent.click(screen.getByRole("button", { name: /more workflow actions/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /versions/i }));
    await userEvent.click(screen.getByRole("button", { name: /more workflow actions/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /export/i }));

    expect(props.onVariables).toHaveBeenCalledOnce();
    expect(props.onVersions).toHaveBeenCalledOnce();
    expect(props.onExport).toHaveBeenCalledOnce();
  });

  it("disables Test and Export when the canvas has no nodes", async () => {
    renderToolbar({ nodeCount: 0 });

    expect(screen.getByRole("button", { name: /test/i })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /more workflow actions/i }));
    expect(await screen.findByRole("menuitem", { name: /export/i })).toHaveAttribute(
      "data-disabled",
    );
  });

  it("shows progress labels while saving and testing", () => {
    renderToolbar({ saving: true, running: true });

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /testing/i })).toBeDisabled();
  });
});
