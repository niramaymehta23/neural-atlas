import {
  argmax,
  backward,
  createAdam,
  createNet,
  exp,
  forward,
  paramCount,
  softmax,
  tanh,
  type TinyNet,
} from "./tiny-net";

/** A loss on the outputs with a known gradient: ½ Σ wᵢ·outᵢ², gradient wᵢ·outᵢ. */
const WEIGHTS = [0.7, -1.3, 0.4];
const lossOf = (net: TinyNet, input: number[]) =>
  Array.from(forward(net, input).output).reduce(
    (sum, out, at) => sum + 0.5 * (WEIGHTS[at] ?? 0) * out * out,
    0,
  );

describe("the tiny network", () => {
  it("has its own exp and tanh, within a hair of the built-in ones", () => {
    for (const x of [-30, -5.5, -1, -0.3, 0, 1e-9, 0.25, 0.9, 3, 12.7, 40]) {
      expect(Math.abs(exp(x) - Math.exp(x)) / Math.exp(x)).toBeLessThan(1e-14);
      expect(Math.abs(tanh(x) - Math.tanh(x))).toBeLessThan(1e-15);
    }
    expect(exp(1000)).toBe(Infinity);
    expect(exp(-1000)).toBe(0);
  });

  it("starts the same from the same seed, and differently from another", () => {
    const shape = { inputs: 5, hidden: 4, outputs: 3 };
    expect(createNet(shape, 3).params).toEqual(createNet(shape, 3).params);
    expect(createNet(shape, 3).params).not.toEqual(createNet(shape, 4).params);
    expect(createNet(shape, 3).params).toHaveLength(paramCount(shape));
  });

  it("passes the gradient back exactly as finite differences measure it", () => {
    const net = createNet({ inputs: 4, hidden: 5, outputs: 3 }, 9);
    // Push the biases off zero so every parameter matters.
    net.params.forEach((value, at) => (net.params[at] = value + 0.1 * Math.sin(at)));
    const input = [0.5, -1, 0, 2];
    const pass = forward(net, input);
    const grads = new Float64Array(net.params.length);
    backward(
      net,
      pass,
      Array.from(pass.output, (out, at) => (WEIGHTS[at] ?? 0) * out),
      grads,
    );
    const nudge = 1e-6;
    for (let at = 0; at < net.params.length; at += 1) {
      const kept = net.params[at] ?? 0;
      net.params[at] = kept + nudge;
      const up = lossOf(net, input);
      net.params[at] = kept - nudge;
      const down = lossOf(net, input);
      net.params[at] = kept;
      const measured = (up - down) / (2 * nudge);
      expect(Math.abs((grads[at] ?? 0) - measured)).toBeLessThan(1e-7);
    }
  });

  it("adds gradients from several passes together", () => {
    const net = createNet({ inputs: 2, hidden: 3, outputs: 1 }, 2);
    const once = new Float64Array(net.params.length);
    backward(net, forward(net, [1, 0]), [1], once);
    const twice = new Float64Array(net.params.length);
    backward(net, forward(net, [1, 0]), [1], twice);
    backward(net, forward(net, [1, 0]), [1], twice);
    twice.forEach((value, at) => expect(value).toBeCloseTo(2 * (once[at] ?? 0), 12));
  });

  it("learns a small mapping with Adam", () => {
    const net = createNet({ inputs: 2, hidden: 6, outputs: 1 }, 5);
    const adam = createAdam(net.params.length);
    const grads = new Float64Array(net.params.length);
    const cases = [
      { input: [0, 0], aim: -0.5 },
      { input: [1, 0], aim: 0.5 },
      { input: [0, 1], aim: 0.5 },
      { input: [1, 1], aim: -0.5 },
    ];
    const error = () =>
      cases.reduce((sum, { input, aim }) => {
        const miss = (forward(net, input).output[0] ?? 0) - aim;
        return sum + miss * miss;
      }, 0);
    const before = error();
    for (let round = 0; round < 500; round += 1) {
      grads.fill(0);
      for (const { input, aim } of cases) {
        const pass = forward(net, input);
        backward(net, pass, [(pass.output[0] ?? 0) - aim], grads);
      }
      adam.step(net.params, grads, 0.03);
    }
    expect(error()).toBeLessThan(before / 100);
  });

  it("turns leanings into chances and finds the biggest", () => {
    const chances = softmax([1, 2, 3]);
    expect(chances.reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(1, 12);
    expect(chances[2]).toBeCloseTo(Math.exp(3) / (Math.exp(1) + Math.exp(2) + Math.exp(3)), 12);
    expect(softmax([1000, 0])[0]).toBe(1);
    expect(argmax([0.1, 0.5, 0.5])).toBe(1);
  });
});
