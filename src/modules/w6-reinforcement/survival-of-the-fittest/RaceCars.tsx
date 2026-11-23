"use client";

import { memo, useEffect, useState } from "react";
import { feel, FEELER_ANGLE, type Track } from "@/engine/rl/racers";
import { CELL, type Square } from "@/visuals/Board";
import type { RaceFrame } from "./model";

/** How long the cars of one race take to drive, when they are shown driving. */
export const DRIVE_MS = 4000;

type Point = { x: number; y: number; heading: number };

/** Where a car is at trail point `at`, and which way it faces (from its next or last move). */
function pointOf(trail: Float32Array, at: number): Point {
  const last = trail.length / 2 - 1;
  const index = Math.max(0, Math.min(last, at));
  const x = trail[index * 2] ?? 0;
  const y = trail[index * 2 + 1] ?? 0;
  const [from, to] = index < last ? [index, index + 1] : [Math.max(0, index - 1), index];
  const dx = (trail[to * 2] ?? 0) - (trail[from * 2] ?? 0);
  const dy = (trail[to * 2 + 1] ?? 0) - (trail[from * 2 + 1] ?? 0);
  return { x, y, heading: dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx) };
}

/** Board coordinates of a place on the track (in squares), given any square's size on the board. */
const toBoard = (square: Square) => {
  const inset = (CELL - square.size) / 2;
  return (value: number) => value * CELL - inset;
};

/** The paths every car took, the best one solid and the others faint and dashed. Drawn once a race. */
const Trails = memo(function Trails({ frame, square }: { frame: RaceFrame; square: Square }) {
  const at = toBoard(square);
  const line = (trail: Float32Array) => {
    const points: string[] = [];
    for (let index = 0; index < trail.length; index += 2)
      points.push(`${at(trail[index] ?? 0).toFixed(1)},${at(trail[index + 1] ?? 0).toFixed(1)}`);
    return points.join(" ");
  };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {frame.trails.map((trail, car) =>
        car === frame.best ? null : (
          <polyline
            key={car}
            points={line(trail)}
            stroke="var(--color-ink-soft)"
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ),
      )}
      {frame.trails[frame.best] && (
        <polyline
          data-best-trail
          points={line(frame.trails[frame.best] ?? new Float32Array())}
          stroke="var(--color-ink)"
          strokeWidth={2.5}
        />
      )}
    </g>
  );
});

/** One toy car: solid for the best driver, outlined for the rest, with a cross once it has crashed. */
function Car({
  point,
  best,
  crashed,
  at,
}: {
  point: Point;
  best: boolean;
  crashed: boolean;
  at: (value: number) => number;
}) {
  const x = at(point.x);
  const y = at(point.y);
  const degrees = (point.heading * 180) / Math.PI;
  return (
    <g
      data-car={best ? "best" : "other"}
      data-crashed={crashed || undefined}
      transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${degrees.toFixed(1)})`}
    >
      <rect
        x={-7}
        y={-4.5}
        width={14}
        height={9}
        rx={3}
        fill={best ? "var(--color-ink)" : "var(--color-card)"}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
      <rect
        x={1.5}
        y={-3}
        width={3}
        height={6}
        rx={1}
        fill={best ? "var(--color-card)" : "var(--color-ink)"}
      />
      {crashed && (
        <path
          d="M-4 -4 L4 4 M4 -4 L-4 4"
          transform={`rotate(${(-degrees).toFixed(1)}) translate(0 -12)`}
          stroke="var(--color-ink)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/**
 * The cars of one race on the track. While `driving`, they drive their recorded paths over
 * DRIVE_MS (one cheap re-render of this layer per animation frame); otherwise they sit where
 * their drives ended. The best car shows its three feelers.
 */
export function RaceCars({
  frame,
  track,
  square,
  driving,
}: {
  frame: RaceFrame;
  track: Track;
  square: Square;
  driving: boolean;
}) {
  const longest = Math.max(1, ...frame.trails.map((trail) => trail.length / 2 - 1));
  const [drove, setDrove] = useState<{ of: RaceFrame | null; step: number }>({ of: null, step: 0 });
  const step = !driving ? longest : drove.of === frame ? drove.step : 0;

  useEffect(() => {
    if (!driving) return;
    let animation = 0;
    let began: number | null = null;
    const tick = (now: number) => {
      began ??= now;
      const share = Math.min(1, (now - began) / DRIVE_MS);
      setDrove({ of: frame, step: Math.round(share * longest) });
      if (share < 1) animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [frame, driving, longest]);

  const at = toBoard(square);
  const bestTrail = frame.trails[frame.best];
  const bestPoint = bestTrail ? pointOf(bestTrail, step) : null;
  const ended = (trail: Float32Array) => step >= trail.length / 2 - 1;
  return (
    <g data-cars data-step={step} data-driving={driving && step < longest ? "" : undefined}>
      <Trails frame={frame} square={square} />
      {bestPoint && (
        <g stroke="var(--color-ink)" strokeWidth={1} strokeDasharray="2 2" data-feelers>
          {[-FEELER_ANGLE, 0, FEELER_ANGLE].map((turn) => {
            const angle = bestPoint.heading + turn;
            const reach = feel(track, bestPoint.x, bestPoint.y, angle);
            return (
              <line
                key={turn}
                x1={at(bestPoint.x).toFixed(1)}
                y1={at(bestPoint.y).toFixed(1)}
                x2={at(bestPoint.x + Math.cos(angle) * reach).toFixed(1)}
                y2={at(bestPoint.y + Math.sin(angle) * reach).toFixed(1)}
              />
            );
          })}
        </g>
      )}
      {frame.trails.map((trail, car) =>
        car === frame.best ? null : (
          <Car
            key={car}
            point={pointOf(trail, step)}
            best={false}
            crashed={(frame.crashed[car] ?? false) && ended(trail)}
            at={at}
          />
        ),
      )}
      {bestTrail && bestPoint && (
        <Car
          point={bestPoint}
          best
          crashed={(frame.crashed[frame.best] ?? false) && ended(bestTrail)}
          at={at}
        />
      )}
    </g>
  );
}
