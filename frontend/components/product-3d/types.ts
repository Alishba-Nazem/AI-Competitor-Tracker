export type ProductColorId = "white" | "black" | "blue" | "red";
export type ProductMaterialId = "matte" | "metallic";

export type ProductMaterialState = {
  colorId: ProductColorId;
  materialId: ProductMaterialId;
  roughness: number;
  autoRotate: boolean;
};

export const PRODUCT_COLORS: Record<ProductColorId, { label: string; hex: string }> = {
  white: { label: "White", hex: "#f4f4f2" },
  black: { label: "Black", hex: "#1f2225" },
  blue: { label: "Blue", hex: "#1d4f7c" },
  red: { label: "Red", hex: "#9f1239" },
};

export const DEFAULT_MATERIAL_STATE: ProductMaterialState = {
  colorId: "blue",
  materialId: "matte",
  roughness: 0.55,
  autoRotate: true,
};
