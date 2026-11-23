import { valueTone } from "@/design/encodings";
import type { Tile } from "@/engine/rl/gridworld";

/**
 * A board's values as `Board` floor tints and +/− marks: each value divided by `scale` (the
 * biggest value worth a full tint), times `strength` (0–1, for a glow that fades in). Walls, the
 * bowl and the lava keep their own look.
 */
export function boardGlow(
  values: ArrayLike<number>,
  tiles: readonly Tile[],
  { scale = 1, strength = 1 }: { scale?: number; strength?: number } = {},
) {
  const floorValues = tiles.map((tile, cell) => {
    if (tile !== "floor" && tile !== "coin") return 0;
    const value = ((values[cell] ?? 0) / (scale > 0 ? scale : 1)) * strength;
    return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
  });
  return { floorValues, floorTones: floorValues.map(valueTone) };
}

/** The biggest size of any value on the board (at least `least`), for a shared scale. */
export function glowScale(values: ArrayLike<number>, least = 1e-9): number {
  let most = least;
  for (let cell = 0; cell < values.length; cell += 1)
    most = Math.max(most, Math.abs(values[cell] ?? 0));
  return most;
}
