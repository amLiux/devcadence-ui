import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomModal } from "./custom-modal";

const mockSetClose = vi.fn();
let mockIsOpen = true;

vi.mock("@/providers/modal-provider", () => ({
  useModal: () => ({
    isOpen: mockIsOpen,
    setClose: mockSetClose,
    setOpen: vi.fn(),
    data: {},
  }),
}));

describe("CustomModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOpen = true;
  });

  it("renders title, subheading, and children when isOpen is true", () => {
    render(
      <CustomModal title="Test Modal Title" subheading="Test Subheading Description">
        <div data-testid="modal-content">Modal Body Content</div>
      </CustomModal>
    );

    expect(screen.getByText("Test Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Test Subheading Description")).toBeInTheDocument();
    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
  });

  it("calls setClose when the Close button is clicked", async () => {
    render(
      <CustomModal title="Test Modal" subheading="Subheading">
        <div>Content</div>
      </CustomModal>
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    await userEvent.click(closeButton);

    expect(mockSetClose).toHaveBeenCalled();
  });
});
