import { binaryCrossEntropy, mean } from "../../autodiff/losses";
import { MLP, type Activation } from "../../autodiff/nn";
import { createOptimiser, zeroGrad, type OptimiserKind } from "../../autodiff/optimisers";
import { createRandom } from "../../random";
import type { Samples } from "../protocol";
import { createDenseLearner } from "./dense-autodiff";

const data = (count: number, seed: number): Samples => {
  const random = createRandom(seed);
  return {
    inputs: Float32Array.from({ length: count * 2 }, () => random.range(-1, 1)),
    targets: Float32Array.from({ length: count }, () => random.int(2)),
    count,
  };
};

const TEAMS: { sizes: number[]; bends: Activation[] }[] = [
  { sizes: [2, 1], bends: ["tanh"] },
  { sizes: [2, 3, 1], bends: ["relu"] },
  { sizes: [2, 4, 4, 1], bends: ["tanh", "leakyRelu"] },
  { sizes: [2, 8, 8, 8, 8, 1], bends: ["tanh", "sigmoid", "relu", "leakyRelu"] },
];

describe("practice on plain arrays", () => {
  it.each(
    TEAMS.flatMap((team) =>
      (["sgd", "momentum", "adam"] as OptimiserKind[]).map((kind) => ({ ...team, kind })),
    ),
  )("is bit for bit the graph's: $sizes $bends $kind", ({ sizes, bends, kind }) => {
    const shape = { sizes, activation: bends };
    const graph = new MLP(shape, createRandom(5));
    const plain = new MLP(shape, createRandom(5));
    const samples = data(37, 9);
    const slow = {
      params: graph.parameters(),
      optimiser: createOptimiser({ kind, learningRate: 0.08 }),
    };
    const fast = {
      params: plain.parameters(),
      optimiser: createOptimiser({ kind, learningRate: 0.08 }),
    };
    const learn = createDenseLearner(shape, fast.params);
    const order = createRandom(3);
    for (let step = 0; step < 60; step += 1) {
      const batch = Array.from({ length: 1 + (step % 16) }, () => order.int(samples.count));
      const loss = mean(
        batch.map((row) =>
          binaryCrossEntropy(
            graph.call(Array.from(samples.inputs.subarray(row * 2, row * 2 + 2)))[0]!,
            samples.targets[row]!,
          ),
        ),
      );
      zeroGrad(slow.params);
      loss.backward();
      const quick = learn(samples, batch);
      expect(quick).toBe(loss.data);
      expect(fast.params.map(({ grad }) => grad + 0)).toEqual(
        slow.params.map(({ grad }) => grad + 0),
      );
      slow.optimiser.step(slow.params);
      fast.optimiser.step(fast.params);
      expect(fast.params.map(({ data }) => data)).toEqual(slow.params.map(({ data }) => data));
    }
  });
});
