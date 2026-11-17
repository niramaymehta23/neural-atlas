"use client";

import { Canvas } from "@react-three/fiber";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { CameraRig, type Vec3 } from "./CameraRig";
import { StageBoundary } from "./StageBoundary";

type SoftStageProps = {
  /** Plain description of the scene for screen readers. */
  label: string;
  camera: { position: Vec3; target?: Vec3 };
  children: ReactNode;
  /**
   * Shown instead of the 3D scene when this device cannot draw it: no WebGL, the scene throws,
   * or the graphics context is lost. It is real content, so it is not wrapped as a picture.
   */
  fallback?: ReactNode;
  className?: string;
};

let supported: boolean | undefined;

/** True when this browser can make a WebGL context at all (asked once, then remembered). */
function canDraw3d(): boolean {
  if (supported !== undefined) return supported;
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    supported = Boolean(context);
  } catch {
    supported = false;
  }
  return supported;
}

const unchanging = () => () => undefined;

/**
 * The shared 3D set: a transparent canvas over the paper, soft even light, rough matte
 * surfaces, no bloom or glow, and frames drawn only when something changes. Colours are drawn
 * flat (no tone mapping) so they match the design tokens (A11Y-26).
 */
export function SoftStage({
  label,
  camera,
  children,
  fallback = null,
  className = "",
}: SoftStageProps) {
  // Unknown (null) on the server and while hydrating, so both renders agree.
  const supports = useSyncExternalStore(unchanging, canDraw3d, () => null);
  const [lost, setLost] = useState(false);
  const drawable = lost ? false : supports;

  return (
    <div className={`relative ${className}`}>
      {drawable === false ? (
        fallback
      ) : (
        <StageBoundary fallback={fallback}>
          <div role="img" aria-label={label} className="absolute inset-0">
            {drawable && (
              <Canvas
                flat
                frameloop="demand"
                dpr={[1, 2]}
                camera={{ fov: 40, position: [...camera.position] }}
                onCreated={({ gl }) =>
                  gl.domElement.addEventListener("webglcontextlost", () => setLost(true), {
                    once: true,
                  })
                }
              >
                <ambientLight intensity={0.9} />
                <directionalLight position={[3, 6, 2]} intensity={1} />
                <CameraRig position={camera.position} target={camera.target} />
                {children}
              </Canvas>
            )}
          </div>
        </StageBoundary>
      )}
    </div>
  );
}
