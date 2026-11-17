import { MLP, readParameters } from "../autodiff/nn";
import { createRandom } from "../random";
import { scoresToOutputs } from "./backends/backend";
import { createFieldReader } from "./forward";
import type { ModelSpec } from "./protocol";

/** Every spot of an n × n grid over −1…1, as pairs. */
const grid = (n: number) =>
  Float32Array.from({ length: n * n * 2 }, (_, index) => {
    const spot = Math.floor(index / 2);
    return ((index % 2 === 0 ? spot % n : Math.floor(spot / n)) / (n - 1)) * 2 - 1;
  });

/**
 * The same forward pass as one bare loop over flat arrays (fixed weights, tanh between layers):
 * the speed the field reader is held to.
 */
function plainDenseReader(sizes: readonly number[]) {
  const weights = sizes.slice(1).map((size, layer) => {
    const inputs = sizes[layer] ?? 0;
    return Float64Array.from({ length: size * (inputs + 1) }, (_, index) => ((index % 7) - 3) / 10);
  });
  const widest = Math.max(...sizes);
  let from = new Float64Array(widest);
  let to = new Float64Array(widest);
  return (spots: Float32Array) => {
    const out = new Float64Array(spots.length / 2);
    for (let spot = 0; spot < out.length; spot += 1) {
      from[0] = spots[spot * 2] ?? 0;
      from[1] = spots[spot * 2 + 1] ?? 0;
      for (let layer = 0; layer < weights.length; layer += 1) {
        const inputs = sizes[layer] ?? 0;
        const size = sizes[layer + 1] ?? 0;
        const layerWeights = weights[layer] ?? new Float64Array();
        for (let cell = 0; cell < size; cell += 1) {
          let total = layerWeights[cell * (inputs + 1) + inputs] ?? 0;
          for (let input = 0; input < inputs; input += 1) {
            total += (layerWeights[cell * (inputs + 1) + input] ?? 0) * (from[input] ?? 0);
          }
          to[cell] = layer === weights.length - 1 ? total : Math.tanh(total);
        }
        [from, to] = [to, from];
      }
      out[spot] = from[0] ?? 0;
    }
    return out;
  };
}

/** About twice the field reader's cost today (1.6 times the bare loop); the old per-neuron objects were 26 times. */
const RATIO = 3;

const INPUTS = Float32Array.from([0.3, -0.8, -0.5, 0.1, 0.9, 0.9, 0, 0]);

describe("createFieldReader", () => {
  it.each<ModelSpec>([
    { sizes: [2, 5, 3, 1], activation: "tanh", loss: "binaryCrossEntropy" },
    { sizes: [2, 4, 3], activation: "relu", loss: "softmaxCrossEntropy" },
    { sizes: [2, 4, 4, 4, 1], activation: ["relu", "sigmoid", "leakyRelu"], loss: "meanSquared" },
  ])("answers like the autodiff MLP for $activation and $loss", (model) => {
    const mlp = new MLP({ sizes: model.sizes, activation: model.activation }, createRandom(9));
    const params = readParameters(mlp.parameters());
    const read = createFieldReader(model);
    const scores = Float32Array.from(
      [0, 1, 2, 3].flatMap((row) => mlp.predict([INPUTS[row * 2]!, INPUTS[row * 2 + 1]!])),
    );
    const expected = scoresToOutputs(scores, model);
    const actual = read(params, INPUTS);
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 6));
  });

  it("reads new parameters on every call", () => {
    const model: ModelSpec = { sizes: [2, 3, 1], activation: "tanh", loss: "binaryCrossEntropy" };
    const read = createFieldReader(model);
    const zeros = new Float64Array(13);
    const first = read(zeros, INPUTS);
    expect([...first]).toEqual([0.5, 0.5, 0.5, 0.5]);
    const pushed = zeros.map((_, index) => (index === 12 ? 2 : 0));
    expect(read(pushed, INPUTS)[0]).toBeCloseTo(1 / (1 + Math.exp(-2)), 6);
  });
});

describe("hidden cells", () => {
  it("says what each hidden cell says, as the autodiff network records it", () => {
    const model: ModelSpec = {
      sizes: [2, 3, 2, 1],
      activation: ["tanh", "relu"],
      loss: "binaryCrossEntropy",
    };
    const mlp = new MLP({ sizes: model.sizes, activation: model.activation }, createRandom(4));
    const params = readParameters(mlp.parameters());
    const [first, second] = createFieldReader(model).hidden(params, INPUTS);
    expect(first).toHaveLength(3 * 4);
    expect(second).toHaveLength(2 * 4);
    for (let row = 0; row < 4; row += 1) {
      mlp.call([INPUTS[row * 2]!, INPUTS[row * 2 + 1]!]);
      mlp.layers[0]!.neurons.forEach((neuron, cell) =>
        expect(first![cell * 4 + row]).toBeCloseTo(neuron.output!.data, 6),
      );
      mlp.layers[1]!.neurons.forEach((neuron, cell) =>
        expect(second![cell * 4 + row]).toBeCloseTo(neuron.output!.data, 6),
      );
    }
  });
});

describe("speed (MLP-01)", () => {
  it("draws the biggest team's 48 × 48 field well inside a frame", () => {
    const model: ModelSpec = {
      sizes: [2, 8, 8, 8, 8, 1],
      activation: "tanh",
      loss: "binaryCrossEntropy",
    };
    const params = readParameters(
      new MLP({ sizes: model.sizes, activation: "tanh" }, createRandom(1)).parameters(),
    );
    const read = createFieldReader(model);
    const spots = grid(48);
    const baseline = plainDenseReader(model.sizes);
    const fastest = (run: () => void) => {
      for (let warm = 0; warm < 20; warm += 1) run();
      return Math.min(
        ...Array.from({ length: 30 }, () => {
          const start = performance.now();
          run();
          return performance.now() - start;
        }),
      );
    };
    // Judged against the same work as a bare loop over flat arrays, timed on the same machine in
    // the same run, so a slow or busy CI runner moves both alike. The fastest run is the cost of
    // the work itself: other test files sharing the CPU can only add time.
    const own = fastest(() => read(params, spots));
    const bare = fastest(() => baseline(spots));
    expect(
      own / bare,
      `field reader ${own.toFixed(2)} ms, bare loop ${bare.toFixed(2)} ms`,
    ).toBeLessThan(RATIO);
  });
});
