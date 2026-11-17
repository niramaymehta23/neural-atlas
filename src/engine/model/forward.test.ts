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
    for (let warm = 0; warm < 20; warm += 1) read(params, spots);
    const times = Array.from({ length: 30 }, () => {
      const start = performance.now();
      read(params, spots);
      return performance.now() - start;
    });
    // The fastest run is the cost of the work itself: other test files sharing the CPU can
    // only add time (about 2 ms here on its own, against 30 ms for the old per-neuron objects).
    expect(Math.min(...times), times.map((time) => time.toFixed(2)).join(" ")).toBeLessThan(4);
  });
});
