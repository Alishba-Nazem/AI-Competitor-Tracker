"use client";

import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import ProductsPageContent from "./products-content";

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading products…" />}>
      <ProductsPageContent />
    </Suspense>
  );
}
