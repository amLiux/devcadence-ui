import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpRequestSettings } from "./http-request";
import { DEFAULT_CACHE_TTL_SECONDS } from "@/lib/workflows/nodes/http-cache";

function renderSettings(meta: Record<string, string>) {
  const handleChange = vi.fn();
  render(
    <HttpRequestSettings
      meta={meta}
      handleChange={handleChange}
      parentOutput={null}
      hasParentEdge={false}
    />,
  );
  return { handleChange };
}

describe("HttpRequestSettings cache controls", () => {
  it("hides the TTL input while caching is disabled", () => {
    renderSettings({ method: "GET" });

    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.queryByLabelText(/time to cache/i)).not.toBeInTheDocument();
  });

  it("enables caching when the switch is toggled on", async () => {
    const { handleChange } = renderSettings({ method: "GET" });

    await userEvent.click(screen.getByRole("switch"));

    expect(handleChange).toHaveBeenCalledWith("cacheEnabled", "true");
  });

  it("shows the default TTL when caching is enabled", () => {
    renderSettings({ method: "GET", cacheEnabled: "true" });

    const ttl = screen.getByLabelText(/time to cache/i);
    expect(ttl).toHaveValue(DEFAULT_CACHE_TTL_SECONDS);
    expect(ttl).toHaveAttribute("min", "1");
    expect(ttl).toHaveAttribute("max", "86400");
  });

  it("reports TTL edits through handleChange", () => {
    const { handleChange } = renderSettings({ method: "GET", cacheEnabled: "true", cacheTtl: "60" });

    fireEvent.change(screen.getByLabelText(/time to cache/i), { target: { value: "120" } });

    expect(handleChange).toHaveBeenCalledWith("cacheTtl", "120");
  });

  it("disables the cache switch for non-GET methods", () => {
    renderSettings({ method: "POST", cacheEnabled: "true" });

    expect(screen.getByRole("switch")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByLabelText(/time to cache/i)).not.toBeInTheDocument();
    expect(screen.getByText(/only get requests can be cached/i)).toBeInTheDocument();
  });
});
