"use client";

import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { cameraGlide, useReducedMotion } from "@/design/motion";

export type Vec3 = readonly [number, number, number];

type CameraRigProps = {
  /** Where the camera sits. */
  position: Vec3;
  /** What it looks at. */
  target?: Vec3;
};

/**
 * Frames the scene for the learner, so nothing needs rotating: on first view it is simply there,
 * and when the position or target changes it glides (instantly under reduced motion).
 */
export function CameraRig({ position, target = [0, 0, 0] }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const reduced = useReducedMotion();
  const focus = useRef<Vector3 | null>(null);
  const [px, py, pz] = position;
  const [tx, ty, tz] = target;

  useEffect(() => {
    const look = () => {
      if (focus.current) camera.lookAt(focus.current);
      invalidate();
    };
    if (!focus.current || reduced) {
      focus.current = new Vector3(tx, ty, tz);
      camera.position.set(px, py, pz);
      look();
      return;
    }
    const timeline = gsap.timeline({ onUpdate: look });
    timeline.to(camera.position, { x: px, y: py, z: pz, ...cameraGlide }, 0);
    timeline.to(focus.current, { x: tx, y: ty, z: tz, ...cameraGlide }, 0);
    return () => {
      timeline.kill();
    };
  }, [camera, invalidate, reduced, px, py, pz, tx, ty, tz]);

  return null;
}
