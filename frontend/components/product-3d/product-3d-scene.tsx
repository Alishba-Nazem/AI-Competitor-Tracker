"use client";

import { Suspense, useEffect, useRef, type ComponentRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { ProductModel } from "./product-model";
import type { ProductMaterialState } from "./types";

export type SceneControlsApi = {
  reset: () => void;
  rotateBy: (radians: number) => void;
  zoomBy: (factor: number) => void;
};

type OrbitControlsInstance = ComponentRef<typeof OrbitControls>;

/**
 * The only file in this feature that imports three.js / R3F / drei.
 * Everything else (viewer shell, configurator, fallback) is plain
 * React + Tailwind, so the heavy 3D chunk only downloads once this
 * module is dynamically imported.
 */
export default function Product3DScene({
  material,
  autoRotate,
  dpr,
  onControlsReady,
}: {
  material: ProductMaterialState;
  autoRotate: boolean;
  dpr: [number, number];
  onControlsReady?: (api: SceneControlsApi) => void;
}) {
  const controlsRef = useRef<OrbitControlsInstance | null>(null);

  useEffect(() => {
    if (!onControlsReady) return;
    onControlsReady({
      reset: () => controlsRef.current?.reset(),
      rotateBy: (radians) => {
        const controls = controlsRef.current;
        if (!controls) return;
        const camera = controls.object;
        const offset = camera.position.clone().sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta += radians;
        spherical.makeSafe();
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        camera.lookAt(controls.target);
        controls.update();
      },
      zoomBy: (factor) => {
        const controls = controlsRef.current;
        if (!controls) return;
        const camera = controls.object;
        const offset = camera.position.clone().sub(controls.target);
        const nextLength = THREE.MathUtils.clamp(
          offset.length() * factor,
          controls.minDistance,
          controls.maxDistance,
        );
        offset.setLength(nextLength);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },
    });
  }, [onControlsReady]);

  return (
    <Canvas
      dpr={dpr}
      shadows
      camera={{ position: [1.6, 1.1, 2.6], fov: 38 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <color attach="background" args={["#f5f5f4"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} castShadow shadow-mapSize={[512, 512]} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.35} />
      <Suspense fallback={null}>
        <ProductModel material={material} spin={autoRotate} />
        <ContactShadows position={[0, -0.85, 0]} opacity={0.35} scale={4} blur={2.2} far={2} />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.35, 0]}
        enablePan={false}
        minDistance={1.6}
        maxDistance={4.5}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.62}
        enableDamping
        dampingFactor={0.12}
      />
    </Canvas>
  );
}
