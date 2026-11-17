import { useMemo } from "react";
import { markPath, warmth, type ClassShape } from "@/design/encodings";

type Spot = { x: number; z: number };

type ValleyMapProps = {
  /** Mistake size at each spot of the −1…1 ground. */
  height: (x: number, z: number) => number;
  markers: readonly (Spot & { tone?: string; shape?: ClassShape })[];
  trails: readonly { points: readonly Spot[]; tone: string; dash?: readonly [number, number] }[];
  /** See-through markers, drawn as dashed outlines. */
  ghosts?: readonly (Spot & { tone?: string; shape?: ClassShape })[];
  /** The keyboard drop spot, ringed. */
  cursor?: Spot | null;
  label: string;
};

/** Squares per side of the map. */
const CELLS = 24;
const VIEW = 200;
const toView = (value: number) => Math.round(((value + 1) / 2) * VIEW * 100) / 100;

/**
 * The valley seen from straight above, for devices that cannot draw 3D: each square is warmer
 * where the mistake is bigger, with the walkers and their paths on top (ENG-12).
 */
export function ValleyMap({ height, markers, trails, ghosts = [], cursor, label }: ValleyMapProps) {
  const squares = useMemo(() => {
    const centre = (index: number) => ((index + 0.5) / CELLS) * 2 - 1;
    const levels = Array.from({ length: CELLS * CELLS }, (_, i) =>
      height(centre(i % CELLS), centre(Math.floor(i / CELLS))),
    );
    const low = Math.min(...levels);
    const span = Math.max(...levels) - low || 1;
    return levels.map((level) => warmth((level - low) / span));
  }, [height]);
  const size = VIEW / CELLS;

  return (
    <svg
      role="img"
      aria-label={label}
      data-valley-map
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="mx-auto block aspect-square h-full max-w-full"
    >
      {squares.map((fill, index) => (
        <rect
          key={index}
          x={(index % CELLS) * size}
          y={Math.floor(index / CELLS) * size}
          width={size + 0.3}
          height={size + 0.3}
          fill={fill}
        />
      ))}
      {trails.map(({ points, tone, dash }, index) => (
        <polyline
          key={index}
          points={points.map(({ x, z }) => `${toView(x)},${toView(z)}`).join(" ")}
          fill="none"
          stroke={tone}
          strokeWidth={1.5}
          strokeDasharray={dash ? dash.map((part) => part * VIEW).join(" ") : undefined}
        />
      ))}
      {ghosts.map(({ x, z, tone, shape = "circle" }, index) => (
        <path
          key={index}
          data-ghost={shape}
          d={markPath(shape, toView(x), toView(z), 5)}
          fill="none"
          stroke={tone ?? "var(--color-accent)"}
          strokeWidth={2}
          strokeDasharray="2 1.5"
        />
      ))}
      {markers.map(({ x, z, tone, shape = "circle" }, index) => (
        <path
          key={index}
          data-marker={shape}
          d={markPath(shape, toView(x), toView(z), 4)}
          fill={tone ?? "var(--color-accent)"}
          stroke="var(--color-ink)"
          strokeWidth={1}
        />
      ))}
      {cursor && (
        <circle
          data-drop-spot
          cx={toView(cursor.x)}
          cy={toView(cursor.z)}
          r={8}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2.5}
        />
      )}
    </svg>
  );
}
