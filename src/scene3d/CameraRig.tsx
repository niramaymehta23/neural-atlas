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
 * A move this close to a change of the view's shape is the scene re-fitting itself to a resize,
 * not something the learner did, so it snaps. (The scene and the canvas measure the new shape
 * separately, so either can come first.)
 */
const RESIZE_WINDOW_MS = 250;

/**
 * Frames the scene for the learner, so nothing needs rotating: on first view it is simply there,
 * and when the position or target changes it glides (instantly under reduced motion). Resizing
 * the window snaps to the new framing rather than gliding over and over.
 */
export function CameraRig({ position, target = [0, 0, 0] }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const aspect = useThree(({ size }) => size.width / Math.max(1, size.height));
  const reduced = useReducedMotion();
  const focus = useRef<Vector3 | null>(null);
  const glide = useRef<{ timeline: gsap.core.Timeline; startedAt: number } | null>(null);
  const shape = useRef({ aspect, changedAt: -Infinity });
  const [px, py, pz] = position;
  const [tx, ty, tz] = target;

  // The view changed shape: note when, and land a glide that a moment-earlier re-fit started.
  useEffect(() => {
    if (aspect === shape.current.aspect) return;
    const now = performance.now();
    shape.current = { aspect, changedAt: now };
    if (glide.current && now - glide.current.startedAt < RESIZE_WINDOW_MS) {
      glide.current.timeline.progress(1);
    }
  }, [aspect]);

  useEffect(() => {
    const look = () => {
      if (focus.current) camera.lookAt(focus.current);
      invalidate();
    };
    const resized = performance.now() - shape.current.changedAt < RESIZE_WINDOW_MS;
    if (!focus.current || reduced || resized) {
      focus.current = new Vector3(tx, ty, tz);
      camera.position.set(px, py, pz);
      look();
      return;
    }
    const timeline = gsap.timeline({ onUpdate: look });
    timeline.to(camera.position, { x: px, y: py, z: pz, ...cameraGlide }, 0);
    timeline.to(focus.current, { x: tx, y: ty, z: tz, ...cameraGlide }, 0);
    glide.current = { timeline, startedAt: performance.now() };
    return () => {
      timeline.kill();
      glide.current = null;
    };
  }, [camera, invalidate, reduced, px, py, pz, tx, ty, tz]);

  return null;
}
