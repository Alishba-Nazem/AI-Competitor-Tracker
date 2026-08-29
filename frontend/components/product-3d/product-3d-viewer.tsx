"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/types";
import { Product3DErrorBoundary } from "./product-3d-error-boundary";
import { Product3DFallback } from "./product-3d-fallback";
import { ProductConfigurator } from "./product-configurator";
import { isWebglAvailable } from "./webgl-support";
import { DEFAULT_MATERIAL_STATE, type ProductMaterialState } from "./types";
import type { SceneControlsApi } from "./product-3d-scene";

// Only file that pulls in three.js / R3F / drei. It is fetched as a
// separate chunk the first time a viewer actually mounts, and never
// server-rendered (WebGL needs a real browser canvas).
const Product3DScene = dynamic(() => import("./product-3d-scene"), {
  ssr: false,
  loading: () => <SceneLoadingSkeleton />,
});

const DPR: [number, number] = [1, 1.5];
const KEYBOARD_ROTATE_STEP = Math.PI / 8;
const KEYBOARD_ZOOM_STEP = 1.15;

function SceneLoadingSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-slate-50"
      role="status"
      aria-live="polite"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" aria-hidden="true" />
      <p className="text-sm text-stone-600">Loading 3D preview…</p>
    </div>
  );
}

export function Product3DViewer({ product }: { product: Product }) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [webglOk] = useState(() => isWebglAvailable());
  const [sceneFailed, setSceneFailed] = useState(false);
  const [material, setMaterial] = useState<ProductMaterialState>({
    ...DEFAULT_MATERIAL_STATE,
    autoRotate: !prefersReducedMotion,
  });
  const controlsApiRef = useRef<SceneControlsApi | null>(null);
  const [controlsReady, setControlsReady] = useState(false);

  const handleControlsReady = useCallback((api: SceneControlsApi) => {
    controlsApiRef.current = api;
    setControlsReady(true);
  }, []);

  const handleChange = useCallback((next: Partial<ProductMaterialState>) => {
    setMaterial((prev) => ({ ...prev, ...next }));
  }, []);

  const showFallback = !webglOk || sceneFailed;
  const autoRotateEffective = material.autoRotate && !prefersReducedMotion;

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div
        className="relative h-[280px] w-full overflow-hidden rounded-xl bg-slate-50 sm:h-[360px] sm:flex-1"
        role="img"
        aria-label={`Interactive 3D preview of ${product.name}. Use the manual view controls to rotate and zoom, or drag/pinch on touch devices.`}
      >
        {showFallback ? (
          <Product3DFallback
            product={product}
            message={
              !webglOk
                ? "3D preview unavailable on this device."
                : "3D preview could not be loaded. Showing product photo instead."
            }
          />
        ) : (
          <Product3DErrorBoundary
            fallback={
              <Product3DFallback
                product={product}
                message="3D preview could not be loaded. Showing product photo instead."
              />
            }
            onError={() => setSceneFailed(true)}
          >
            <Product3DScene
              material={material}
              autoRotate={autoRotateEffective}
              dpr={DPR}
              onControlsReady={handleControlsReady}
            />
          </Product3DErrorBoundary>
        )}
      </div>

      <div className="w-full sm:w-64 sm:shrink-0">
        <ProductConfigurator
          state={material}
          onChange={handleChange}
          controlsDisabled={showFallback || !controlsReady}
          reducedMotion={prefersReducedMotion}
          onReset={() => controlsApiRef.current?.reset()}
          onRotateLeft={() => controlsApiRef.current?.rotateBy(-KEYBOARD_ROTATE_STEP)}
          onRotateRight={() => controlsApiRef.current?.rotateBy(KEYBOARD_ROTATE_STEP)}
          onZoomIn={() => controlsApiRef.current?.zoomBy(1 / KEYBOARD_ZOOM_STEP)}
          onZoomOut={() => controlsApiRef.current?.zoomBy(KEYBOARD_ZOOM_STEP)}
        />
      </div>
    </div>
  );
}
