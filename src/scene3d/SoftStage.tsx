"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { CameraRig, type Vec3 } from "./CameraRig";

type SoftStageProps = {
  /** Plain description of the scene for screen readers. */
  label: string;
  camera: { position: Vec3; target?: Vec3 };
  children: ReactNode;
  className?: string;
};

/**
 * The shared 3D set: a transparent canvas over the paper, soft even light, rough matte
 * surfaces, no bloom or glow, and frames drawn only when something changes.
 */
export function SoftStage({ label, camera, children, className = "" }: SoftStageProps) {
  return (
    <div role="img" aria-label={label} className={`relative ${className}`}>
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 40, position: [...camera.position] }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 6, 2]} intensity={1.2} />
        <CameraRig position={camera.position} target={camera.target} />
        {children}
      </Canvas>
    </div>
  );
}
