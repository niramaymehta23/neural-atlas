import { fullness } from "@/design/encodings";

type NeuronDotProps = {
  at: readonly [number, number];
  /** How strongly it is firing (0–1): busier neurons look more filled in. */
  activation: number;
  radius?: number;
};

/** One tiny voter, drawn as a cut-paper dot. */
export function NeuronDot({ at, activation, radius = 11 }: NeuronDotProps) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={radius} fill="var(--color-paper)" />
      <circle
        cx={at[0]}
        cy={at[1]}
        r={radius}
        fill="var(--color-flow)"
        fillOpacity={fullness(activation)}
        stroke="var(--color-ink-soft)"
        strokeWidth={1.25}
      />
    </g>
  );
}
