import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import { Product3DViewer } from "./product-3d-viewer";

// framer-motion's useReducedMotion() caches the OS-level media query result
// once, the first time any component calls it in this module registry. To
// exercise the reduced-motion branch deterministically we mock
// window.matchMedia before that first read, in an isolated test file so it
// never leaks into the default-motion assertions in the sibling test file.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

const product: Product = {
  id: 1,
  competitorId: 1,
  name: "Floating on Air Perfume",
  url: "https://example.com/products/floating-on-air",
  currentPrice: 2500,
  currency: "PKR",
  imageUrl: "https://example.com/floating-on-air.jpg",
};

describe("Product3DViewer with prefers-reduced-motion: reduce", () => {
  it("disables auto rotate and explains why", () => {
    render(<Product3DViewer product={product} />);
    const toggle = screen.getByLabelText("Toggle auto rotate");
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/off · reduced motion/)).toBeInTheDocument();
  });
});
