/**
 * What the picture model (MobileNet v1, public/models/mobilenet-v1-025-v1) does with one picture:
 * the patterns it finds at three depths, its best answers, the numbers just before its answer
 * (for teaching it new groups) and the faint nudge that changes its mind. Runs wherever TensorFlow.js
 * runs: the vision worker in the browser, the CPU backend in tests.
 */
import * as tf from "@tensorflow/tfjs-core";
import * as tfl from "@tensorflow/tfjs-layers";

/** The model reads 224 × 224 colour pictures. */
export const SIDE = 224;
export const PIXELS = SIDE * SIDE;

/** The three depths a lesson shows, shallow to deep, and the patterns shown from each. */
export const STAGES = [
  { stage: "edges", layer: "conv1_relu", size: 112 },
  { stage: "shapes", layer: "conv_pw_5_relu", size: 28 },
  { stage: "parts", layer: "conv_pw_11_relu", size: 14 },
] as const;
export type Stage = (typeof STAGES)[number]["stage"];
/** Patterns shown per depth. */
export const SHOWN = 6;
/**
 * Which of each depth's patterns are shown: the ones that change most from photo to photo across the
 * sample photos (measured once by `seeing.test.ts`), so the maps are rarely blank.
 */
export const SHOWN_PATTERNS: Record<Stage, readonly number[]> = {
  edges: [0, 1, 2, 3, 4, 5],
  shapes: [0, 1, 2, 3, 4, 5],
  parts: [0, 1, 2, 3, 4, 5],
};
/** The numbers just before the answer: one per pattern of the last depth. */
export const FEATURES = 256;
/** Things the model knows. */
export const THINGS = 1000;
export const TOP = 5;

/** One answer: the thing's number, its everyday name (from things.json) and the model's share for it. */
export type Answer = { thing: number; name: string; share: number };

export type PatternMaps = {
  stage: Stage;
  size: number;
  /** SHOWN maps of size × size, each 0 (nothing found) … 1 (found most strongly at this depth). */
  maps: Float32Array;
};

export type Seen = {
  answers: Answer[];
  maps?: PatternMaps[];
  features?: Float32Array;
};

export type Fooled = {
  before: Answer[];
  after: Answer[];
  /** The nudged picture, RGBA like the input. */
  pixels: Uint8ClampedArray;
};

/** Loads the model from memory (tests) or a URL (the worker passes `tfl.loadLayersModel`'s handler). */
export type LoadedVision = {
  see(pixels: Uint8ClampedArray, options: { maps?: boolean; features?: boolean }): Promise<Seen>;
  fool(pixels: Uint8ClampedArray, strength: number): Promise<Fooled>;
  dispose(): void;
};

/** RGBA bytes (224 × 224 × 4) to the model's input: one picture, colours in −1…1. */
function toInput(pixels: Uint8ClampedArray): tf.Tensor4D {
  if (pixels.length !== PIXELS * 4) throw new Error("A picture must be 224 × 224.");
  return tf.tidy(() => {
    const rgba = tf.tensor3d(
      new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.length),
      [SIDE, SIDE, 4],
      "int32",
    );
    const rgb = tf.slice(rgba, [0, 0, 0], [SIDE, SIDE, 3]);
    return tf.expandDims(tf.sub(tf.div(tf.cast(rgb, "float32"), 127.5), 1), 0) as tf.Tensor4D;
  });
}

/** The best `TOP` answers, best first; ties go to the lower thing number. */
export function topAnswers(shares: ArrayLike<number>, things: readonly string[] = []): Answer[] {
  const order = Array.from({ length: shares.length }, (_, thing) => thing);
  order.sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0) || a - b);
  return order
    .slice(0, TOP)
    .map((thing) => ({ thing, name: things[thing] ?? "", share: shares[thing] ?? 0 }));
}

/** One depth's shown maps, each scaled by the strongest value found anywhere at that depth. */
function mapsOf(stage: Stage, size: number, values: Float32Array, channels: number): PatternMaps {
  const shown = SHOWN_PATTERNS[stage];
  let strongest = 0;
  for (const value of values) strongest = Math.max(strongest, value);
  const maps = new Float32Array(SHOWN * size * size);
  for (let map = 0; map < SHOWN; map += 1) {
    const channel = shown[map] ?? 0;
    for (let spot = 0; spot < size * size; spot += 1) {
      maps[map * size * size + spot] =
        strongest > 0 ? (values[spot * channels + channel] ?? 0) / strongest : 0;
    }
  }
  return { stage, size, maps };
}

/** `things` are the everyday names of the model's 1,000 things (things.json beside the model). */
export function createVision(model: tfl.LayersModel, things: readonly string[] = []): LoadedVision {
  const answer = model.outputs[0];
  const outputs = [
    ...STAGES.map(({ layer }) => model.getLayer(layer).output as tfl.SymbolicTensor),
    model.getLayer("global_average_pooling2d_1").output as tfl.SymbolicTensor,
    answer as tfl.SymbolicTensor,
  ];
  const inside = tfl.model({ inputs: model.inputs, outputs });

  const shares = (input: tf.Tensor4D) =>
    tf.tidy(() => tf.reshape(model.predict(input) as tf.Tensor, [THINGS]));

  return {
    async see(pixels, options) {
      const input = toInput(pixels);
      try {
        if (!options.maps && !options.features) {
          const out = shares(input);
          const values = await out.data();
          out.dispose();
          return { answers: topAnswers(values, things) };
        }
        const results = inside.predict(input) as tf.Tensor[];
        try {
          const read = await Promise.all(results.map((tensor) => tensor.data()));
          const seen: Seen = { answers: topAnswers(read.at(-1) as Float32Array, things) };
          if (options.features)
            seen.features = Float32Array.from(read[STAGES.length] as Float32Array);
          if (options.maps) {
            seen.maps = STAGES.map(({ stage, size }, index) =>
              mapsOf(stage, size, read[index] as Float32Array, results[index]?.shape.at(-1) ?? 1),
            );
          }
          return seen;
        } finally {
          for (const tensor of results) tensor.dispose();
        }
      } finally {
        input.dispose();
      }
    },

    async fool(pixels, strength) {
      const input = toInput(pixels);
      const first = shares(input);
      const beforeShares = await first.data();
      first.dispose();
      const before = topAnswers(beforeShares, things);
      const target = before[0]?.thing ?? 0;
      // A few small steps against the first answer, never more than `strength` from the picture
      // (in −1…1 units: 2/255 is one shade of one colour).
      const limit = (2 * Math.max(0, strength)) / 255;
      const steps = 4;
      let nudged: tf.Tensor = tf.clone(input);
      const loss = (x: tf.Tensor) =>
        tf.neg(
          tf.log(
            tf.add(
              tf.gather(tf.reshape(model.apply(x, { training: false }) as tf.Tensor, [THINGS]), [
                target,
              ]),
              1e-7,
            ),
          ),
        );
      const slope = tf.grad(loss);
      for (let step = 0; step < steps; step += 1) {
        const next = tf.tidy(() => {
          const pushed = tf.add(nudged, tf.mul(tf.sign(slope(nudged)), limit / 2));
          return tf.clipByValue(
            tf.add(input, tf.clipByValue(tf.sub(pushed, input), -limit, limit)),
            -1,
            1,
          );
        });
        nudged.dispose();
        nudged = next;
      }
      // Back to bytes, and read the answer from exactly the bytes that will be shown.
      const bytes = tf.tidy(() =>
        tf.cast(tf.round(tf.mul(tf.add(tf.reshape(nudged, [SIDE, SIDE, 3]), 1), 127.5)), "int32"),
      );
      const rgb = await bytes.data();
      bytes.dispose();
      nudged.dispose();
      input.dispose();
      const out = new Uint8ClampedArray(PIXELS * 4);
      for (let spot = 0; spot < PIXELS; spot += 1) {
        out[spot * 4] = rgb[spot * 3] ?? 0;
        out[spot * 4 + 1] = rgb[spot * 3 + 1] ?? 0;
        out[spot * 4 + 2] = rgb[spot * 3 + 2] ?? 0;
        out[spot * 4 + 3] = 255;
      }
      const after = await this.see(out, {});
      return { before, after: after.answers, pixels: out };
    },

    dispose() {
      // `inside` shares the model's layers and owns no numbers of its own.
      model.dispose();
    },
  };
}
