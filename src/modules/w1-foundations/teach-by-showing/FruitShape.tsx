import { warmth } from "@/design/encodings";
import type { Fruit } from "./model";

const PATHS = {
  0: "M20 10 C8 4 2 16 6 28 C9 36 16 38 20 35 C24 38 31 36 34 28 C38 16 32 4 20 10 Z",
  1: "M20 4 C15 4 15 14 12 20 C7 28 10 38 20 38 C30 38 33 28 28 20 C25 14 25 4 20 4 Z",
} as const;

type FruitShapeProps = {
  fruit: Fruit;
  /** Size in px. */
  size?: number;
  /** Spoken name; omitted, the fruit is hidden from screen readers (its words are nearby). */
  label?: string;
  /** A small mark in the corner: a tick, a cross, or nothing. */
  mark?: "right" | "wrong";
  /** Drawn with a dashed outline, for a fruit in the wrong basket. */
  dashed?: boolean;
};

/**
 * One fruit, drawn from the two facts the robot sees: rounder fruit are wider, redder fruit are
 * warmer. Its kind is its shape (an apple has a stalk and a round body, a pear a narrow top), so
 * it never rests on colour.
 */
export function FruitShape({ fruit, size = 40, label, mark, dashed = false }: FruitShapeProps) {
  const wide = 0.75 + 0.5 * fruit.round;
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-fruit={fruit.kind === 0 ? "apple" : "pear"}
      data-mark={mark}
    >
      <g transform={`translate(20 0) scale(${wide.toFixed(3)} 1) translate(-20 0)`}>
        <path
          d={PATHS[fruit.kind]}
          fill={warmth(fruit.red)}
          stroke="var(--color-ink)"
          strokeWidth={1.4}
          strokeDasharray={dashed ? "3 2" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      </g>
      {fruit.kind === 0 && (
        <path d="M20 10 L23 3" stroke="var(--color-ink)" strokeWidth={2} strokeLinecap="round" />
      )}
      {mark && (
        <circle cx={31.5} cy={30.5} r={6.5} fill="var(--color-paper)" stroke="var(--color-ink)" />
      )}
      {mark === "right" && (
        <path d="M27 31 L30 34 L36 27" fill="none" stroke="var(--color-ink)" strokeWidth={2.4} />
      )}
      {mark === "wrong" && (
        <path
          d="M28 27 L35 34 M35 27 L28 34"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2.4}
        />
      )}
    </svg>
  );
}
