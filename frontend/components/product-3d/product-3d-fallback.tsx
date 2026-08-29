import type { Product } from "@/lib/types";

/**
 * Shown instead of the canvas whenever the 3D scene cannot run: no WebGL,
 * the scene chunk failed to load, or it threw at runtime. The rest of the
 * product experience (name, price, capture actions) is unaffected because
 * this component never touches app state.
 */
export function Product3DFallback({
  product,
  message = "3D preview unavailable on this device.",
}: {
  product: Product;
  message?: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 p-6 text-center">
      {product.imageUrl ? (
        // Real scraped product photo, already used elsewhere in the app.
        // eslint-disable-next-line @next/next/no-img-element -- external, unoptimized competitor-store URL
        <img
          src={product.imageUrl}
          alt={product.name}
          className="max-h-40 w-auto max-w-[80%] object-contain"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className="grid h-20 w-20 place-items-center rounded-full bg-slate-200 text-2xl text-stone-500"
        >
          📦
        </div>
      )}
      <p className="max-w-xs text-sm font-medium text-stone-600">{message}</p>
    </div>
  );
}
