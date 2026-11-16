"use client";

import { useEffect, useRef } from "react";
import { speed } from "@/design/encodings";
import { useReducedMotion } from "@/design/motion";
import { cssRgb, useResolvedColours } from "@/design/paint";
import type { Point } from "./network-layout";

type FlowPath = { from: Point; to: Point; /** 0–1: busier paths move faster. */ activity: number };

type FlowParticlesProps = {
  paths: readonly FlowPath[];
  /** The coordinate box the paths are in (matches the SVG they sit over). */
  width: number;
  height: number;
};

const DOT_RADIUS = 2.4;

/**
 * Information flowing: one small sky dot per path, on a single canvas and a single frame loop,
 * so hundreds of paths stay smooth. Still under reduced motion (nothing is drawn).
 */
export function FlowParticles({ paths, width, height }: FlowParticlesProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(paths);
  const reduced = useReducedMotion();
  const [flow] = useResolvedColours(["var(--color-flow)"]);

  useEffect(() => {
    latest.current = paths;
  }, [paths]);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || reduced || !flow) return;
    const scale = window.devicePixelRatio || 1;
    context.canvas.width = width * scale;
    context.canvas.height = height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = cssRgb(flow);
    let frame = 0;
    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.beginPath();
      latest.current.forEach(({ from, to, activity }, index) => {
        if (activity <= 0.02) return;
        const progress = (time / 1000 / speed(activity) + index * 0.618) % 1;
        const x = from[0] + (to[0] - from[0]) * progress;
        const y = from[1] + (to[1] - from[1]) * progress;
        context.moveTo(x + DOT_RADIUS, y);
        context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      });
      context.fill();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [flow, reduced, width, height]);

  if (reduced) return null;
  return (
    <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
  );
}
