import { TILES, type Tile } from "@/engine/rl/gridworld";
import { oneOf } from "@/platform/clamp";

/**
 * Board pieces the World 6 board lessons share: a board drawn as rows of marks, a link's board
 * made safe, and one square painted. The start square is the puppy's and is never painted.
 */
const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap", c: "coin" };

/** Rows of marks (`.` floor, `#` wall, `G` bowl, `~` lava, `c` treat, `S` the start) as tiles. */
export const tilesFrom = (rows: readonly string[]): Tile[] =>
  rows.flatMap((row) => [...row].map((mark) => MARKS[mark] ?? "floor"));

/**
 * A link's board: the same size as `initial`, only tiles from `allowed` (any known tile by
 * default), and the start left as it is.
 */
export const keepTiles = (
  saved: readonly unknown[],
  initial: readonly Tile[],
  start: number,
  allowed: readonly Tile[] = TILES,
) =>
  initial.map((fallback, index) =>
    index === start ? fallback : oneOf(saved[index], allowed, fallback),
  );

/** The board with square `index` painted `brush`; unchanged for the start or an unchanged square. */
export function painted(tiles: readonly Tile[], index: number, brush: Tile, start: number) {
  if (index === start || tiles[index] === brush || tiles[index] === undefined) return null;
  return tiles.map((tile, at) => (at === index ? brush : tile));
}
