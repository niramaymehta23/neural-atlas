import { createRandom } from "../random";
import {
  allFinite,
  createTrainer,
  gradient,
  hiddenOutputs,
  meanLoss,
  paramCount,
  predict,
  startParams,
  type DenseData,
  type DenseSpec,
} from "./dense";
import { binaryCrossEntropy, mean, meanSquared } from "./losses";
import { MLP, readParameters, writeParameters, type Activation } from "./nn";
import { createOptimiser, OPTIMISERS, zeroGrad } from "./optimisers";

const H = 1e-6;
const DATA: DenseData = {
  inputs: [0.3, -1.2, -0.7, 0.5, 1.1, 0.9, -0.2, -0.4],
  targets: [1, 0, 1, 0],
};
const BENDS: Activation[] = ["tanh", "relu", "leakyRelu", "sigmoid"];

/** The same network built from autodiff Values, with the same numbers. */
function valueNetwork(spec: DenseSpec, params: ArrayLike<number>) {
  const mlp = new MLP({ sizes: spec.sizes, activation: spec.bends }, createRandom(1));
  writeParameters(mlp.parameters(), params);
  return mlp;
}

function valueLoss(spec: DenseSpec, mlp: MLP, data: DenseData) {
  const width = spec.sizes[0] ?? 1;
  const rows = data.inputs.length / width;
  return mean(
    Array.from({ length: rows }, (_, row) => {
      const input = Array.from({ length: width }, (_, at) => data.inputs[row * width + at] ?? 0);
      const outputs = mlp.call(input);
      return spec.loss === "logistic"
        ? binaryCrossEntropy(outputs[0]!, data.targets[row] ?? 0)
        : meanSquared(outputs, [data.targets[row] ?? 0]);
    }),
  );
}

/** Starting numbers nudged off zero, so no cell sits exactly on a cut-off's corner. */
function nudged(spec: DenseSpec, seed = 4) {
  const params = startParams(spec.sizes, { seed });
  const random = createRandom(seed + 1);
  return params.map((value) => value + random.range(-0.3, 0.3));
}

describe("dense network maths", () => {
  for (const bend of BENDS)
    for (const loss of ["squared", "logistic"] as const)
      it(`matches the autodiff network for ${bend} with a ${loss} score`, () => {
        const spec: DenseSpec = { sizes: [2, 4, 3, 1], bends: [bend], loss };
        const params = nudged(spec);
        const mlp = valueNetwork(spec, params);
        const total = valueLoss(spec, mlp, DATA);
        total.backward();
        expect(meanLoss(spec, params, DATA)).toBeCloseTo(total.data, 12);
        const expected = mlp.parameters().map(({ grad }) => grad);
        const got = Array.from(gradient(spec, params, DATA));
        got.forEach((value, index) => expect(value).toBeCloseTo(expected[index] ?? NaN, 10));
        const outputs = predict(spec, params, DATA.inputs);
        expect(outputs[0]).toBeCloseTo(mlp.predict([0.3, -1.2])[0] ?? NaN, 12);
      });

  it("gets calmed layers' slopes right (checked against central differences)", () => {
    const spec: DenseSpec = { sizes: [2, 5, 4, 1], bends: ["tanh"], loss: "squared", calm: true };
    const params = nudged(spec, 9);
    const grads = gradient(spec, params, DATA);
    for (let index = 0; index < params.length; index += 1) {
      const original = params[index] ?? 0;
      params[index] = original + H;
      const up = meanLoss(spec, params, DATA);
      params[index] = original - H;
      const down = meanLoss(spec, params, DATA);
      params[index] = original;
      expect(grads[index]).toBeCloseTo((up - down) / (2 * H), 5);
    }
  });

  it("calming keeps every hidden layer's signals centred and the same size", () => {
    const spec: DenseSpec = { sizes: [2, 6, 1], bends: ["identity"], loss: "squared", calm: true };
    const params = startParams(spec.sizes, { seed: 2, scale: 8 });
    const [layer] = hiddenOutputs(spec, params, [0.5, 0.5]);
    const values = Array.from(layer ?? []);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const spread = Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length);
    expect(average).toBeCloseTo(0, 6);
    expect(spread).toBeCloseTo(1, 3);
  });

  it.each(OPTIMISERS)(
    "one %s round on the whole set equals the autodiff optimiser's step",
    (kind) => {
      const spec: DenseSpec = { sizes: [2, 3, 1], bends: ["tanh"], loss: "logistic" };
      const params = nudged(spec);
      const mlp = valueNetwork(spec, params);
      const optimiser = createOptimiser({ kind, learningRate: 0.1, momentum: 0.9 });
      for (let round = 0; round < 3; round += 1) {
        zeroGrad(mlp.parameters());
        valueLoss(spec, mlp, DATA).backward();
        optimiser.step(mlp.parameters());
      }
      const trainer = createTrainer(spec, Float64Array.from(params), DATA, {
        optimiser: kind,
        learningRate: 0.1,
        momentum: 0.9,
        seed: 1,
      });
      for (let round = 0; round < 3; round += 1) trainer.round();
      const expected = readParameters(mlp.parameters());
      trainer.params.forEach((value, index) =>
        expect(value).toBeCloseTo(expected[index] ?? NaN, 10),
      );
    },
  );

  it("practice lowers the mistake, and the same seed gives the same run", () => {
    const spec: DenseSpec = { sizes: [2, 6, 1], bends: ["tanh"], loss: "logistic", dropout: 0.2 };
    const run = () => {
      const trainer = createTrainer(spec, startParams(spec.sizes, { seed: 3 }), DATA, {
        optimiser: "adam",
        learningRate: 0.05,
        batchSize: 2,
        seed: 8,
      });
      const losses = Array.from({ length: 200 }, () => trainer.round().loss);
      return { losses, params: Array.from(trainer.params) };
    };
    const first = run();
    expect(first.losses.at(-1)).toBeLessThan((first.losses[0] ?? 0) / 2);
    expect(run()).toEqual(first);
  });

  it("follows a step plan, round by round", () => {
    const spec: DenseSpec = { sizes: [2, 1], bends: [], loss: "squared" };
    const rates: number[] = [];
    const trainer = createTrainer(spec, startParams(spec.sizes, { seed: 1 }), DATA, {
      optimiser: "sgd",
      learningRate: (round) => {
        rates.push(round);
        return 0;
      },
      seed: 1,
    });
    const before = Array.from(trainer.params);
    trainer.round();
    trainer.round();
    expect(rates).toEqual([0, 1]);
    expect(Array.from(trainer.params)).toEqual(before);
  });

  it("starts every cell the same when asked, and reports blame for every layer", () => {
    const spec: DenseSpec = { sizes: [2, 3, 3, 1], bends: ["sigmoid"], loss: "squared" };
    const params = startParams(spec.sizes, { seed: 5, same: true });
    expect(params.length).toBe(paramCount(spec.sizes));
    expect(params.slice(0, 2)).toEqual(params.slice(3, 5));
    const trainer = createTrainer(spec, params, DATA, {
      optimiser: "sgd",
      learningRate: 0.1,
      seed: 1,
    });
    const report = trainer.round();
    expect(report.blame).toHaveLength(3);
    expect(report.blame.every((value) => value >= 0)).toBe(true);
    expect(allFinite(trainer.params)).toBe(true);
    expect(allFinite([1, Infinity])).toBe(false);
  });
});
