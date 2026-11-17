import { thickness, weightDash, weightTone } from "@/design/encodings";

type EdgeProps = {
  from: readonly [number, number];
  to: readonly [number, number];
  /** Signed weight; the sign picks the colour, and negative ones are dashed. */
  weight: number;
  /** |weight| relative to the strongest connection on screen (0–1): thicker is stronger. */
  strength: number;
};

/** One connection between two neurons, fully opaque so it keeps its contrast (A11Y-07). */
export function Edge({ from, to, weight, strength }: EdgeProps) {
  // Rounded: server and browser may differ in the last digit of seeded maths (hydration).
  const width = Math.round(thickness(strength) * 100) / 100;
  const dash = weightDash(weight, width);
  return (
    <line
      data-sign={weight < 0 ? "negative" : "positive"}
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke={weightTone(weight)}
      strokeWidth={width}
      strokeLinecap={dash ? "butt" : "round"}
      strokeDasharray={dash}
    />
  );
}
