import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("lists the notification settings section", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(link).toHaveAttribute("href", "/settings/notifications");
  });
});
