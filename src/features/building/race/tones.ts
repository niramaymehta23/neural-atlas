/**
 * The walkers' colours, from the palette in tokens.css. The ground runs from sky to rose in
 * both themes, so the colours are fixed rather than themed, and every walker and trail wears a
 * dark rim that stands out from both ends of the ground (DH-08). `tones.test.ts` checks both.
 */
export const WALKER_PALETTE = ["ink-black", "ivory", "sage"] as const;
export const RIM_PALETTE = "ink-black";
/** The two ends of the ground's colour scale (`warmth` in encodings.ts). */
export const GROUND_PALETTE = ["sky", "rose"] as const;

export const WALKER_TONES = WALKER_PALETTE.map((name) => `var(--${name})`);
export const RIM_TONE = `var(--${RIM_PALETTE})`;
