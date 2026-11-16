import { thickness, weightTone } from "@/design/encodings";

type EdgeProps = {
  from: readonly [number, number];
  to: readonly [number, number];
  /** Signed weight; the sign picks the colour. */
  weight: number;
  /** |weight| relative to the strongest connection on screen (0–1): thicker is stronger. */
  strength: number;
};

/** One connection between two neurons. */
export function Edge({ from, to, weight, strength }: EdgeProps) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke={weightTone(weight)}
      // Rounded: server and browser may differ in the last digit of seeded maths (hydration).
      strokeWidth={Math.round(thickness(strength) * 100) / 100}
      strokeLinecap="round"
      strokeOpacity={0.75}
    />
  );
}
