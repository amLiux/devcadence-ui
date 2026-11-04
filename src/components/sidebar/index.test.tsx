import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "./index";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/notifications",
}));

describe("Sidebar", () => {
  it("keeps the parent item active on a subroute", () => {
    const { container } = render(
      <TooltipProvider>
        <Sidebar />
      </TooltipProvider>,
    );

    expect(container.querySelector('a[href="/settings"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(container.querySelector('a[href="/docs"]')).not.toHaveAttribute("aria-current");
  });
});
