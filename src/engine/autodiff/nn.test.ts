import { createRandom } from "../random";
import { binaryCrossEntropy, mean, meanSquared, softmaxCrossEntropy } from "./losses";
import { ACTIVATIONS, MLP, readParameters, writeParameters, type Activation } from "./nn";
import { createOptimiser, OPTIMISERS, zeroGrad } from "./optimisers";
import { Value } from "./value";

const H = 1e-5;
const INPUTS = [
  [0.3, -1.2],
  [-0.7, 0.5],
  [1.1, 0.9],
];

type LossCase = [string, number, (outputs: Value[], row: number) => Value];
const LOSSES: LossCase[] = [
  ["mean squared", 2, (outputs, row) => meanSquared(outputs, [row * 0.5, -1])],
  ["binary cross-entropy", 1, (outputs, row) => binaryCrossEntropy(outputs[0]!, row % 2)],
  ["softmax cross-entropy", 3, (outputs, row) => softmaxCrossEntropy(outputs, row % 3)],
];

function batchLoss(mlp: MLP, loss: LossCase[2]): Value {
  return mean(INPUTS.map((input, row) => loss(mlp.call(input), row)));
}

describe("MLP gradients", () => {
  for (const activation of ACTIVATIONS) {
    it.each(LOSSES)(`${activation} with %s matches central differences`, (_name, outputs, loss) => {
      const mlp = new MLP({ sizes: [2, 4, 3, outputs], activation }, createRandom(3));
      const params = mlp.parameters();
      // Zero biases can sit exactly on relu's corner, where no slope exists; move them off it.
      const random = createRandom(5);
      for (const param of params) param.data += random.range(-0.3, 0.3);
      batchLoss(mlp, loss).backward();
      for (const param of params) {
        const original = param.data;
        param.data = original + H;
        const up = batchLoss(mlp, loss).data;
        param.data = original - H;
        const down = batchLoss(mlp, loss).data;
        param.data = original;
        expect(Math.abs(param.grad - (up - down) / (2 * H))).toBeLessThan(1e-6);
      }
    });
  }

  it("keeps binary cross-entropy finite for extreme scores", () => {
    for (const score of [-800, 800]) {
      const logit = new Value(score);
      const loss = binaryCrossEntropy(logit, 1);
      loss.backward();
      expect(Number.isFinite(loss.data)).toBe(true);
      expect(Number.isFinite(logit.grad)).toBe(true);
    }
  });
});

describe("MLP", () => {
  it("is shaped by its sizes and seeded identically", () => {
    const shape = { sizes: [2, 5, 1], activation: "tanh" as Activation };
    const a = new MLP(shape, createRandom(11));
    expect(a.parameters()).toHaveLength(2 * 5 + 5 + 5 + 1);
    expect(readParameters(a.parameters())).toEqual(
      readParameters(new MLP(shape, createRandom(11)).parameters()),
    );
    expect(readParameters(a.parameters())).not.toEqual(
      readParameters(new MLP(shape, createRandom(12)).parameters()),
    );
  });

  it("records each neuron's latest output for drawing", () => {
    const mlp = new MLP({ sizes: [2, 3, 1], activation: "relu" }, createRandom(1));
    const [out] = mlp.call([0.5, -0.5]);
    expect(mlp.layers[1]?.neurons[0]?.output).toBe(out);
    expect(mlp.layers[0]?.neurons.every((neuron) => (neuron.output?.data ?? -1) >= 0)).toBe(true);
  });

  it("predicts the same as a full forward pass", () => {
    for (const activation of ACTIVATIONS) {
      const mlp = new MLP({ sizes: [2, 4, 3], activation, output: "sigmoid" }, createRandom(2));
      const input = [0.4, -0.9];
      expect(mlp.predict(input)).toEqual(mlp.call(input).map((value) => value.data));
    }
  });

  it("restores parameters exactly", () => {
    const mlp = new MLP({ sizes: [2, 3, 1], activation: "sigmoid" }, createRandom(1));
    const saved = readParameters(mlp.parameters());
    const before = mlp.call([0.2, 0.4])[0]!.data;
    writeParameters(mlp.parameters(), new Float64Array(saved.length));
    writeParameters(mlp.parameters(), saved);
    expect(mlp.call([0.2, 0.4])[0]!.data).toBe(before);
  });
});

describe("optimisers", () => {
  it.each(OPTIMISERS)("%s rolls downhill on a bowl", (kind) => {
    const point = [new Value(2), new Value(-3)];
    const optimiser = createOptimiser({ kind, learningRate: 0.05 });
    const height = () => Value.sum(point.map((p, i) => p.pow(2).mul(i + 1)));
    const start = height().data;
    for (let step = 0; step < 100; step += 1) {
      zeroGrad(point);
      height().backward();
      optimiser.step(point);
    }
    expect(height().data).toBeLessThan(start * 0.1);
  });
});
