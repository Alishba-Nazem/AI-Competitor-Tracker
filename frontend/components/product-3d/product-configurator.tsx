"use client";

import {
  PRODUCT_COLORS,
  type ProductColorId,
  type ProductMaterialId,
  type ProductMaterialState,
} from "./types";

const MATERIAL_OPTIONS: Array<{ id: ProductMaterialId; label: string }> = [
  { id: "matte", label: "Matte" },
  { id: "metallic", label: "Metallic" },
];

/**
 * Plain Tailwind controls, no three.js imports here. It stays mounted even
 * while the canvas chunk is still loading so the panel never feels broken.
 */
export function ProductConfigurator({
  state,
  onChange,
  onReset,
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  controlsDisabled,
  reducedMotion,
}: {
  state: ProductMaterialState;
  onChange: (next: Partial<ProductMaterialState>) => void;
  onReset: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  controlsDisabled: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-700">
          Product color
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRODUCT_COLORS) as ProductColorId[]).map((colorId) => {
            const option = PRODUCT_COLORS[colorId];
            const active = state.colorId === colorId;
            return (
              <button
                key={colorId}
                type="button"
                onClick={() => onChange({ colorId })}
                aria-pressed={active}
                aria-label={`${option.label} color`}
                title={option.label}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  active ? "border-[#1d4f7c] scale-110" : "border-slate-200"
                }`}
                style={{ backgroundColor: option.hex }}
              />
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-700">
          Material
        </legend>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {MATERIAL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={state.materialId === option.id}
              onClick={() => onChange({ materialId: option.id })}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                state.materialId === option.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-stone-600 hover:text-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-700">
          Roughness ({Math.round(state.roughness * 100)}%)
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={state.roughness}
          onChange={(event) => onChange({ roughness: Number(event.target.value) })}
          aria-valuetext={`${Math.round(state.roughness * 100)} percent`}
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <span className="text-sm font-medium text-slate-800">
          Auto rotate
          {reducedMotion && <span className="ml-1 text-xs text-stone-500">(off · reduced motion)</span>}
        </span>
        <input
          type="checkbox"
          checked={state.autoRotate && !reducedMotion}
          disabled={reducedMotion}
          onChange={(event) => onChange({ autoRotate: event.target.checked })}
          aria-label="Toggle auto rotate"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="sr-only" id="manual-view-controls-label">
          Manual view controls
        </span>
        <button
          type="button"
          className="button-secondary !px-3"
          onClick={onRotateLeft}
          disabled={controlsDisabled}
          aria-label="Rotate view left"
        >
          ⟲
        </button>
        <button
          type="button"
          className="button-secondary !px-3"
          onClick={onRotateRight}
          disabled={controlsDisabled}
          aria-label="Rotate view right"
        >
          ⟳
        </button>
        <button
          type="button"
          className="button-secondary !px-3"
          onClick={onZoomOut}
          disabled={controlsDisabled}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="button-secondary !px-3"
          onClick={onZoomIn}
          disabled={controlsDisabled}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="button-secondary ml-auto"
          onClick={onReset}
          disabled={controlsDisabled}
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
