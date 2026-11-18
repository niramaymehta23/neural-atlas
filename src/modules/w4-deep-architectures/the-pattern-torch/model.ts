/**
 * The pattern torch: a 3 × 3 pattern of "light here", "dark here" and "anything" swept over a grey
 * photo. At every spot it scores how well the photo matches the pattern; the finding map shows
 * where the match is strong enough to count. That is one convolution with a cut-off.
 */
import { SINGLE_PHOTOS, type SinglePhoto } from "@/features/inside/use-photo";
import type { TimelineFrame } from "@/platform/contract";

/** One torch cell: wants light (1), wants dark (−1) or does not mind (0). */
export type Cell = -1 | 0 | 1;
export const CELLS = 9;

export const PRESETS = ["upDown", "sideways", "spot", "blank"] as const;
export type Preset = (typeof PRESETS)[number];

export const TORCHES: Record<Preset, readonly Cell[]> = {
  // Dark on the left, light on the right: edges that run up and down.
  upDown: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  // Dark above, light below: edges that run side to side.
  sideways: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  // A light spot with dark all round.
  spot: [-1, -1, -1, -1, 1, -1, -1, -1, -1],
  blank: [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export type TorchState = {
  photo: SinglePhoto;
  torch: Cell[];
  /** "How far the torch has swept", 0 (not started) … 1 (the whole photo). */
  sweep: number;
  /** "How strong a match counts", 0 (any match) … 1 (only a perfect one). */
  strict: number;
};

/** What the scene has worked out for the state on screen; missions and guesses read it. */
export type TorchFrame = TimelineFrame & {
  key: string;
  /** The strongest match anywhere on the photo that counts, 0–1. */
  strongest: number;
  /** Where the up-and-down edge torch lights up: on edges ("edges"), elsewhere, or nowhere. */
  lit: "edges" | "bright" | "nowhere";
};

/** The grey picture the torch sweeps: 112 × 112 brightness values in 0–1. */
export const GREY_SIDE = 112;
/** Finding map size: one score per spot the torch can sit on (it stays inside the photo). */
export const MAP_SIDE = GREY_SIDE - 2;
/** Above this, "how strong a match counts" is so strict that nothing would ever be found. */
export const MOST_STRICT_FOR_MISSION = 0.5;
/** A match this weak or weaker is nothing. */
export const NOTHING = 0.02;

export const keyOf = ({ photo, torch, strict }: Pick<TorchState, "photo" | "torch" | "strict">) =>
  `${photo}|${torch.join(",")}|${strict}`;

export const isPhoto = (value: unknown): value is SinglePhoto =>
  SINGLE_PHOTOS.includes(value as SinglePhoto);

/** Which preset a torch is, if any. */
export const presetOf = (torch: readonly Cell[]): Preset | null =>
  PRESETS.find((preset) => TORCHES[preset].every((cell, index) => cell === torch[index])) ?? null;

/** The next cell when a cell is tapped: anything → light → dark → anything. */
export const nextCell = (cell: Cell): Cell => (cell === 0 ? 1 : cell === 1 ? -1 : 0);

/** RGBA photo bytes (224 × 224) to brightness, two by two pixels into one. */
export function greyOf(pixels: Uint8ClampedArray, side = 224): Float32Array {
  const half = side / 2;
  const grey = new Float32Array(half * half);
  for (let row = 0; row < half; row += 1) {
    for (let column = 0; column < half; column += 1) {
      let sum = 0;
      for (const [dy, dx] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ] as const) {
        const at = ((row * 2 + dy) * side + column * 2 + dx) * 4;
        sum +=
          0.299 * (pixels[at] ?? 0) + 0.587 * (pixels[at + 1] ?? 0) + 0.114 * (pixels[at + 2] ?? 0);
      }
      grey[row * half + column] = sum / 4 / 255;
    }
  }
  return grey;
}

/**
 * The raw score at every spot: each cell's wish (light +1, dark −1) times how light the photo is
 * there (−½ dark … ½ light), added up and divided by the cells that wish anything, so a perfect
 * match on pure black and white scores 1. A blank torch scores 0 everywhere.
 */
export function scores(grey: Float32Array, torch: readonly Cell[]): Float32Array {
  const map = new Float32Array(MAP_SIDE * MAP_SIDE);
  const wishing = torch.filter((cell) => cell !== 0).length;
  if (wishing === 0) return map;
  for (let row = 0; row < MAP_SIDE; row += 1) {
    for (let column = 0; column < MAP_SIDE; column += 1) {
      let sum = 0;
      for (let cell = 0; cell < CELLS; cell += 1) {
        const wish = torch[cell] ?? 0;
        if (wish === 0) continue;
        const y = row + Math.floor(cell / 3);
        const x = column + (cell % 3);
        sum += wish * ((grey[y * GREY_SIDE + x] ?? 0) - 0.5);
      }
      map[row * MAP_SIDE + column] = (2 * sum) / wishing;
    }
  }
  return map;
}

/** What counts: the part of each score above the strictness, scaled back to 0–1. */
export function findings(raw: Float32Array, strict: number): Float32Array {
  const floor = Math.min(0.99, Math.max(0, strict));
  return raw.map((score) => Math.max(0, (score - floor) / (1 - floor)));
}

/** How many map rows the sweep has covered (the torch sweeps row by row, top to bottom). */
export const sweptRows = (sweep: number) => Math.round(Math.min(1, Math.max(0, sweep)) * MAP_SIDE);

/** The torch's spot for a sweep: its row and column on the finding map. */
export function torchSpot(sweep: number): { row: number; column: number } {
  const total = MAP_SIDE * MAP_SIDE;
  const at = Math.min(total - 1, Math.round(Math.min(1, Math.max(0, sweep)) * total));
  return { row: Math.floor(at / MAP_SIDE), column: at % MAP_SIDE };
}

/** How strongly the photo has edges at each spot (any direction), for telling edges from bright. */
function edgeStrength(grey: Float32Array): Float32Array {
  const map = new Float32Array(MAP_SIDE * MAP_SIDE);
  for (let row = 0; row < MAP_SIDE; row += 1) {
    for (let column = 0; column < MAP_SIDE; column += 1) {
      const at = (y: number, x: number) => grey[(row + y) * GREY_SIDE + column + x] ?? 0;
      map[row * MAP_SIDE + column] = Math.abs(at(1, 2) - at(1, 0)) + Math.abs(at(2, 1) - at(0, 1));
    }
  }
  return map;
}

/**
 * Where the up-and-down edge torch lights up, told from the photo itself: are its strongest finds
 * on edges, or on bright plain parts?
 */
export function whereEdgeTorchLights(grey: Float32Array): TorchFrame["lit"] {
  const found = findings(scores(grey, TORCHES.upDown), 0);
  const edges = edgeStrength(grey);
  const order = Array.from(found.keys()).sort((a, b) => (found[b] ?? 0) - (found[a] ?? 0));
  const top = order.slice(0, 200);
  if ((found[top[0] ?? 0] ?? 0) <= NOTHING) return "nowhere";
  const meanEdge = edges.reduce((sum, value) => sum + value, 0) / edges.length;
  const topEdge = top.reduce((sum, spot) => sum + (edges[spot] ?? 0), 0) / top.length;
  return topEdge > 2 * meanEdge ? "edges" : "bright";
}

/** The frame for a state once its photo is read. */
export function frameFor(state: TorchState, grey: Float32Array, epoch: number): TorchFrame {
  const found = findings(scores(grey, state.torch), state.strict);
  let strongest = 0;
  for (const value of found) strongest = Math.max(strongest, value);
  return {
    epoch,
    loss: 0,
    key: keyOf(state),
    strongest,
    lit: whereEdgeTorchLights(grey),
  };
}
