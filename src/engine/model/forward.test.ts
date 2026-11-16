import { MLP, readParameters } from "../autodiff/nn";
import { createRandom } from "../random";
import { scoresToOutputs } from "./backends/backend";
import { createFieldReader } from "./forward";
import type { ModelSpec } from "./protocol";

const INPUTS = Float32Array.from([0.3, -0.8, -0.5, 0.1, 0.9, 0.9, 0, 0]);

describe("createFieldReader", () => {
  it.each<ModelSpec>([
    { sizes: [2, 5, 3, 1], activation: "tanh", loss: "binaryCrossEntropy" },
    { sizes: [2, 4, 3], activation: "relu", loss: "softmaxCrossEntropy" },
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
