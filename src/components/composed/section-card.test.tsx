import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionCard } from "./section-card";

describe("SectionCard", () => {
  it("links to the section and shows its description", () => {
    render(
      <SectionCard
        href="/settings/notifications"
        title="Notifications"
        description="Get a message when a run fails."
        icon={<span>icon</span>}
      />,
    );

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(link).toHaveAttribute("href", "/settings/notifications");
    expect(screen.getByText("Get a message when a run fails.")).toBeInTheDocument();
  });

  it("renders the optional status and badge", () => {
    render(
      <SectionCard
        href="/docs/tutorial"
        title="Tutorial"
        description="Start here."
        icon={<span>icon</span>}
        status={<span>Completed</span>}
        badge={<span>Start here</span>}
      />,
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Start here")).toBeInTheDocument();
  });
});
