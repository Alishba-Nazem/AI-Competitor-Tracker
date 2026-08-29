"use client";

import { Modal } from "@/components/ui";
import { formatPrice, isAwaitingCapture } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Product3DViewer } from "./product-3d-viewer";

export function Product3DModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  if (!product) return null;

  const pending = isAwaitingCapture(product.currentPrice);

  return (
    <Modal
      title="3D Product View"
      description={
        pending
          ? product.name
          : `${product.name} · ${formatPrice(Number(product.currentPrice), product.currency)}`
      }
      onClose={onClose}
      widthClassName="max-w-3xl"
    >
      <Product3DViewer product={product} />
    </Modal>
  );
}
