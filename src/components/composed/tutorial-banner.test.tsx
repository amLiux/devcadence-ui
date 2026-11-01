import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TutorialBanner } from "./tutorial-banner";

const mockUsePathname = vi.fn();
const mockUseTutorialProgress = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/hooks/use-tutorial-progress", () => ({
  useTutorialProgress: () => mockUseTutorialProgress(),
}));

describe("TutorialBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/workflows");
    mockUseTutorialProgress.mockReturnValue({ completed: false });
  });

  it("renders the banner when tutorial is not completed and not on docs page", () => {
    render(<TutorialBanner />);

    expect(screen.getByText(/New to DevDock\?/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Complete the tutorial/i })).toHaveAttribute(
      "href",
      "/docs/tutorial"
    );
  });

  it("does not render when tutorial is completed", () => {
    mockUseTutorialProgress.mockReturnValue({ completed: true });
    const { container } = render(<TutorialBanner />);

    expect(container.firstChild).toBeNull();
  });

  it("does not render when pathname starts with /docs", () => {
    mockUsePathname.mockReturnValue("/docs/connections");
    const { container } = render(<TutorialBanner />);

    expect(container.firstChild).toBeNull();
  });

  it("dismisses the banner when close button is clicked", async () => {
    render(<TutorialBanner />);

    expect(screen.getByText(/New to DevDock\?/i)).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons[buttons.length - 1];
    await userEvent.click(closeBtn);

    expect(screen.queryByText(/New to DevDock\?/i)).not.toBeInTheDocument();
  });
});
