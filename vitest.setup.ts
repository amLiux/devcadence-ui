import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import "@testing-library/jest-dom/vitest";
import React from "react";

expect.extend(matchers);

// Mock next/image because it requires Next.js image optimization in jsdom
vi.mock("next/image", () => ({
  default: function MockImage(props: Record<string, unknown>) {
    return React.createElement("img", {
      ...props,
      alt: (props.alt as string) || "",
    });
  },
}));

// Mock next/navigation hooks used by some components
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
