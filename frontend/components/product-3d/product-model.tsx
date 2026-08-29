"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { PRODUCT_COLORS, type ProductMaterialState } from "./types";

const CAP_COLOR = "#141517";
const AUTO_ROTATE_RADIANS_PER_SEC = 0.35;

/**
 * Lightweight procedural "product" mesh (bottle-style: body + neck + cap).
 * Built entirely from primitive geometries so there is no external GLB/GLTF
 * asset to fetch, license, or ship. Kept low-poly on purpose: this whole
 * group is a few thousand triangles, well under budget for a mobile GPU.
 */
export function ProductModel({
  material,
  spin,
}: {
  material: ProductMaterialState;
  /** When false, auto-rotate never advances (manual mode / reduced motion). */
  spin: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const color = PRODUCT_COLORS[material.colorId].hex;
  const metalness = material.materialId === "metallic" ? 0.85 : 0.05;

  useFrame((_, delta) => {
    if (!spin || !groupRef.current) return;
    groupRef.current.rotation.y += delta * AUTO_ROTATE_RADIANS_PER_SEC;
  });

  return (
    <group ref={groupRef} position={[0, -0.05, 0]}>
      {/* Body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.72, 1.55, 48]} />
        <meshStandardMaterial color={color} roughness={material.roughness} metalness={metalness} />
      </mesh>
      {/* Shoulder taper */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.32, 0.62, 0.32, 48]} />
        <meshStandardMaterial color={color} roughness={material.roughness} metalness={metalness} />
      </mesh>
      {/* Neck */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.24, 0.32, 0.3, 32]} />
        <meshStandardMaterial color={color} roughness={material.roughness} metalness={metalness} />
      </mesh>
      {/* Cap (stays neutral so material changes remain easy to see on the body) */}
      <mesh castShadow position={[0, 1.34, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.26, 32]} />
        <meshStandardMaterial color={CAP_COLOR} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Label band */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.735, 0.735, 0.55, 48, 1, true]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.85}
          metalness={0}
          transparent
          opacity={0.16}
        />
      </mesh>
    </group>
  );
}
