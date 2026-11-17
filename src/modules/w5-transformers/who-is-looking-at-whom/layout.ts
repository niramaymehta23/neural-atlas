/**
 * Where the word chips and threads go, in pixels. Chips are spaced by their measured sizes along
 * a gentle arc: in a row when the sentence fits the box, otherwise in a column, so the words
 * never overlap and never need sideways scrolling. In a row, threads to later words go over the
 * top and threads to earlier words underneath; in a column, later words are reached on the
 * right and earlier ones on the left.
 */

/** Room beside the chips (above and below a row) for threads. */
export const THREAD_ROOM = 104;
/** Height of a chip, until it can be measured. */
export const CHIP = 32;
/** Least space between two chips in a row. */
export const GAP = 6;
/** Most space between two chips when there is room to spare, so short sentences stay together. */
export const SPREAD = 56;
/** Space at each end of the row. */
export const PAD = 8;
/** Space between two chips in a column. */
export const ROW_GAP = 8;
/** How far the middle of the arc bows out from its ends. */
export const SAG = 18;

export type Size = { width: number; height: number };

export type Layout = {
  orientation: "row" | "column";
  /** The picture's size. */
  width: number;
  height: number;
  /** Each chip's centre and size, by place in the sentence. */
  x: number[];
  y: number[];
  sizes: Size[];
};

/** A guess at a chip's size before it can be measured (and in tests, where nothing has size). */
export const estimateSize = (word: string): Size => ({
  width: 18 + [...word].length * 8,
  height: CHIP,
});

/** How wide a row of these chips would be. */
export const rowWidth = (sizes: readonly Size[]) =>
  sizes.reduce((sum, { width }) => sum + width, 0) + GAP * Math.max(0, sizes.length - 1) + 2 * PAD;

/** Lays chips of `sizes` out in a box `box` pixels wide: a row if it fits, else a column. */
export function layout(sizes: readonly Size[], box: number): Layout {
  return rowWidth(sizes) <= box || sizes.length < 2 ? row(sizes, box) : column(sizes, box);
}

/** How far along the arc's half-span a point is, curved: 0 at the ends, 1 in the middle. */
const bow = (position: number, middle: number, half: number) => {
  const u = Math.min(1, Math.abs(position - middle) / Math.max(1, half));
  return 1 - u * u;
};

function row(sizes: readonly Size[], box: number): Layout {
  const count = sizes.length;
  const total = sizes.reduce((sum, { width }) => sum + width, 0);
  const width = Math.max(box, rowWidth(sizes));
  const spacing =
    count > 1 ? Math.min(SPREAD, Math.max(GAP, (width - 2 * PAD - total) / (count - 1))) : 0;
  const used = total + spacing * Math.max(0, count - 1);
  const tallest = Math.max(CHIP, ...sizes.map(({ height }) => height));
  let left = (width - used) / 2;
  const x = sizes.map((size) => {
    const centre = left + size.width / 2;
    left += size.width + spacing;
    return centre;
  });
  const half = (used - (sizes[0]?.width ?? 0) / 2 - (sizes.at(-1)?.width ?? 0) / 2) / 2;
  const base = THREAD_ROOM + SAG + tallest / 2;
  const y = x.map((centre) => base - SAG * bow(centre, width / 2, half));
  return {
    orientation: "row",
    width,
    height: 2 * THREAD_ROOM + SAG + tallest,
    x,
    y,
    sizes: [...sizes],
  };
}

function column(sizes: readonly Size[], box: number): Layout {
  const widest = Math.max(0, ...sizes.map(({ width }) => width));
  const width = Math.max(box, widest + 2 * SAG + 2 * 48);
  let top = PAD;
  const y = sizes.map(({ height }) => {
    const centre = top + height / 2;
    top += height + ROW_GAP;
    return centre;
  });
  const height = top - ROW_GAP + PAD;
  const half = ((y.at(-1) ?? 0) - (y[0] ?? 0)) / 2;
  const x = y.map((centre) => width / 2 - SAG / 2 + SAG * bow(centre, height / 2, half));
  return { orientation: "column", width, height, x, y, sizes: [...sizes] };
}

/**
 * A soft arc from word `from` to word `to` (places in `place`), higher for longer jumps; returns
 * the path, where it lands (for the end dot) and which side it runs on.
 */
export function thread(place: Layout, from: number, to: number) {
  const forward = to > from;
  const sign = forward ? -1 : 1;
  const round = (value: number) => Math.round(value * 10) / 10;
  const size = (index: number) => place.sizes[index] ?? { width: 0, height: CHIP };
  const x = (index: number) => place.x[index] ?? 0;
  const y = (index: number) => place.y[index] ?? 0;
  if (place.orientation === "row") {
    const edge = (index: number) => y(index) + sign * (size(index).height / 2 + 3);
    const [x1, x2, y1, y2] = [x(from), x(to), edge(from), edge(to)];
    const lift = Math.min(THREAD_ROOM - 10, 18 + Math.abs(x2 - x1) * 0.3);
    // A quadratic curve peaks halfway to its control point, so the control sits twice as far out.
    const control = forward ? Math.min(y1, y2) - 2 * lift : Math.max(y1, y2) + 2 * lift;
    return {
      d: `M ${round(x1)} ${round(y1)} Q ${round((x1 + x2) / 2)} ${round(control)} ${round(x2)} ${round(y2)}`,
      end: { x: round(x2), y: round(y2) },
      side: forward ? ("over" as const) : ("under" as const),
    };
  }
  // A column: later words are reached round the right, earlier ones round the left.
  const edge = (index: number) => x(index) - sign * (size(index).width / 2 + 3);
  const [x1, x2, y1, y2] = [edge(from), edge(to), y(from), y(to)];
  const room = (place.width - Math.max(...place.sizes.map(({ width }) => width))) / 2 - 8;
  const lift = Math.max(8, Math.min(room / 1.2, 14 + Math.abs(y2 - y1) * 0.3));
  const control = forward ? Math.max(x1, x2) + 2 * lift : Math.min(x1, x2) - 2 * lift;
  return {
    d: `M ${round(x1)} ${round(y1)} Q ${round(control)} ${round((y1 + y2) / 2)} ${round(x2)} ${round(y2)}`,
    end: { x: round(x2), y: round(y2) },
    side: forward ? ("right" as const) : ("left" as const),
  };
}
