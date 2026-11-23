import {
  classMark,
  classTone,
  markPath,
  regionTone,
  tileMark,
  tileTone,
  valueTone,
  weightTone,
  type TileKind,
} from "@/design/encodings";
import { cssRgb, resolveColours } from "@/design/paint";

/** Steps of sureness in a painted guess. */
const SURE_STEPS = 24;
/** Steps of value, from the worst square to the best. */
const VALUE_STEPS = 33;
const KINDS: readonly TileKind[] = ["floor", "wall", "goal", "trap", "coin"];

export type Palette = {
  ink: string;
  soft: string;
  paper: string;
  card: string;
  hairline: string;
  accent: string;
  groups: readonly [string, string];
  weights: { up: string; down: string };
  tiles: Record<TileKind, string>;
  /** RGB bytes of a painted guess: group, then how sure. */
  regions: readonly (readonly (readonly [number, number, number])[])[];
  values: readonly string[];
};

/** Every colour the shows draw with, resolved in the theme in force (one style pass). */
export function readPalette(): Palette {
  const names = [
    "var(--color-ink)",
    "var(--color-ink-soft)",
    "var(--color-paper)",
    "var(--color-card)",
    "var(--color-hairline)",
    "var(--color-accent)",
    classTone(0),
    classTone(1),
    weightTone(1),
    weightTone(-1),
    ...KINDS.map(tileTone),
  ];
  const sure = [0, 1].flatMap((group) =>
    Array.from({ length: SURE_STEPS }, (_, step) => regionTone(group, step / (SURE_STEPS - 1))),
  );
  const values = Array.from({ length: VALUE_STEPS }, (_, step) =>
    valueTone((step / (VALUE_STEPS - 1)) * 2 - 1),
  );
  const all = resolveColours([...names, ...sure, ...values]);
  const css = all.map(cssRgb);
  const at = (index: number) => css[index] ?? "";
  const regionsFrom = names.length;
  const valuesFrom = regionsFrom + sure.length;
  return {
    ink: at(0),
    soft: at(1),
    paper: at(2),
    card: at(3),
    hairline: at(4),
    accent: at(5),
    groups: [at(6), at(7)],
    weights: { up: at(8), down: at(9) },
    tiles: {
      floor: at(10),
      wall: at(11),
      goal: at(12),
      trap: at(13),
      coin: at(14),
    },
    regions: [0, 1].map((group) =>
      all.slice(regionsFrom + group * SURE_STEPS, regionsFrom + (group + 1) * SURE_STEPS),
    ),
    values: css.slice(valuesFrom),
  };
}

/** The colour of a square this good, −1 to 1. */
export const valueColour = ({ values }: Palette, value: number) => {
  const share = Number.isFinite(value) ? (Math.min(1, Math.max(-1, value)) + 1) / 2 : 0.5;
  return values[Math.round(share * (VALUE_STEPS - 1))] ?? "";
};

/** RGB bytes for a guess with this chance of the second group. */
export function regionBytes({ regions }: Palette, chance: number) {
  const group = chance >= 0.5 ? 1 : 0;
  const sure = Math.min(1, Math.abs(chance - 0.5) * 2);
  return regions[group]?.[Math.round(sure * (SURE_STEPS - 1))] ?? [0, 0, 0];
}

/** Shapes drawn many times a frame, made once: marks around (0, 0), glyphs in a 0–1 box. */
export function makeShapes() {
  return {
    groups: [0, 1].map((group) => new Path2D(markPath(classMark(group), 0, 0, 1))),
    tiles: new Map(
      KINDS.map((kind) => {
        const mark = tileMark(kind);
        return [kind, mark ? new Path2D(mark.path) : null] as const;
      }),
    ),
  };
}
export type Shapes = ReturnType<typeof makeShapes>;

/** What a show draws with and where. */
export type Painter = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  palette: Palette;
  shapes: Shapes;
  /** The page's own two typefaces, as it resolved them. */
  serif: string;
  sans: string;
  /** Reduced motion: nothing slides or grows between one picture and the next. */
  still: boolean;
};

/** One thing to watch. Everything it keeps has a fixed size, so it can run all day. */
export type Show = {
  /** Moves on by this much time. Under reduced motion it is called rarely, with more time at once. */
  advance: (seconds: number) => void;
  draw: (painter: Painter) => void;
  /** What is happening, in words. */
  describe: () => string;
};
