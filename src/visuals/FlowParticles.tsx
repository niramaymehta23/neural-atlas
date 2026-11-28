"use client";

import { useEffect, useId, useRef } from "react";
import { drawingLoop, FLOW_RATE } from "@/design/drawing-loop";
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
/** The still version: a sky wash along each path, strongest at its far end for the busiest. */
const STILL = { width: 3, mostOpacity: 0.7 };

/**
 * Information flowing: one small sky dot per path, on a single canvas and a single frame loop,
 * so hundreds of paths stay smooth. Under reduced motion each path instead gets a still sky
 * gradient towards where it flows, as strong as the path is busy (A11Y-27).
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
    let time = 0;
    const draw = (seconds: number) => {
      time += seconds;
      context.clearRect(0, 0, width, height);
      context.beginPath();
      latest.current.forEach(({ from, to, activity }, index) => {
        if (activity <= 0.02) return;
        const progress = (time / speed(activity) + index * 0.618) % 1;
        const x = from[0] + (to[0] - from[0]) * progress;
        const y = from[1] + (to[1] - from[1]) * progress;
        context.moveTo(x + DOT_RADIUS, y);
        context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      });
      context.fill();
    };
    return drawingLoop(draw, { rate: FLOW_RATE, element: context.canvas });
  }, [flow, reduced, width, height]);

  if (reduced) return <StillFlow paths={paths} width={width} height={height} />;
  return (
    <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
  );
}

function StillFlow({ paths, width, height }: FlowParticlesProps) {
  const prefix = useId();
  return (
    <svg
      aria-hidden
      data-still
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0 size-full"
    >
      {paths.map(({ from, to, activity }, index) =>
        activity <= 0.02 ? null : (
          <g key={index}>
            <linearGradient
              id={`${prefix}-${index}`}
              gradientUnits="userSpaceOnUse"
              x1={from[0]}
              y1={from[1]}
              x2={to[0]}
              y2={to[1]}
            >
              <stop offset="0" stopColor="var(--color-flow)" stopOpacity={0} />
              <stop
                offset="1"
                stopColor="var(--color-flow)"
                stopOpacity={Math.round(Math.min(1, activity) * STILL.mostOpacity * 100) / 100}
              />
            </linearGradient>
            <line
              data-activity={activity}
              x1={from[0]}
              y1={from[1]}
              x2={to[0]}
              y2={to[1]}
              stroke={`url(#${prefix}-${index})`}
              strokeWidth={STILL.width}
              strokeLinecap="round"
            />
          </g>
        ),
      )}
    </svg>
  );
}
