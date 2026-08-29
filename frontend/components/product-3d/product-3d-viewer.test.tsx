import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import { Product3DViewer } from "./product-3d-viewer";

// jsdom has no WebGL, so these tests exercise the same fallback path a real
// browser without WebGL (or a scene load failure) would take. That keeps
// the suite honest instead of mocking WebGL support to force the happy path.

const product: Product = {
  id: 1,
  competitorId: 1,
  name: "Floating on Air Perfume",
  url: "https://example.com/products/floating-on-air",
  currentPrice: 2500,
  currency: "PKR",
  imageUrl: "https://example.com/floating-on-air.jpg",
};

describe("Product3DViewer", () => {
  it("falls back to the product photo when WebGL is unavailable, without crashing", () => {
    render(<Product3DViewer product={product} />);
    expect(screen.getByText("3D preview unavailable on this device.")).toBeInTheDocument();
    expect(screen.getByAltText(product.name)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: new RegExp(`Interactive 3D preview of ${product.name}`, "i") }),
    ).toBeInTheDocument();
  });

  it("still renders the customization controls when the canvas cannot mount", () => {
    render(<Product3DViewer product={product} />);
    expect(screen.getByRole("button", { name: "White color" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Black color" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Matte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Metallic" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Roughness/)).toBeInTheDocument();
    const autoRotate = screen.getByLabelText("Toggle auto rotate");
    expect(autoRotate).toBeInTheDocument();
    expect(autoRotate).toBeEnabled();
    expect(autoRotate).toBeChecked();
    expect(screen.getByRole("button", { name: "Reset view" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate view left" })).toBeDisabled();
  });

  it("falls back to a generic placeholder when the product has no image", () => {
    render(<Product3DViewer product={{ ...product, imageUrl: null }} />);
    expect(screen.getByText("3D preview unavailable on this device.")).toBeInTheDocument();
    expect(screen.queryByAltText(product.name)).not.toBeInTheDocument();
  });
});
