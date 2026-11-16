import { Value } from "./value";

const H = 1e-5;
const TOLERANCE = 1e-6;

/** Central difference of a scalar function. */
function numeric(f: (x: number) => number, x: number): number {
  return (f(x + H) - f(x - H)) / (2 * H);
}

const UNARY: [string, (v: Value) => Value, number[]][] = [
  ["exp", (v) => v.exp(), [-1.3, 0.2, 1.7]],
  ["log", (v) => v.log(), [0.3, 1, 4.2]],
  ["relu", (v) => v.relu(), [-0.8, 0.6]],
  ["leakyRelu", (v) => v.leakyRelu(), [-0.8, 0.6]],
  ["tanh", (v) => v.tanh(), [-1.1, 0, 0.9]],
  ["sigmoid", (v) => v.sigmoid(), [-2, 0.1, 3]],
  ["pow 3", (v) => v.pow(3), [-1.5, 0.7]],
  ["div", (v) => new Value(2).div(v.add(3)), [-1, 2]],
  ["composite", (v) => v.mul(v).sub(v.tanh().mul(2)).add(v.sigmoid().exp()), [-0.4, 1.2]],
];

describe("Value", () => {
  it.each(UNARY)("%s matches central differences", (_name, f, points) => {
    for (const x of points) {
      const input = new Value(x);
      f(input).backward();
      expect(Math.abs(input.grad - numeric((t) => f(new Value(t)).data, x))).toBeLessThan(
        TOLERANCE,
      );
    }
  });

  it("accumulates through shared inputs and sums", () => {
    const a = new Value(1.5);
    const b = new Value(-0.5);
    const out = Value.sum([a.mul(b), a.mul(a), b]);
    out.backward();
    expect(a.grad).toBeCloseTo(b.data + 2 * a.data, 12);
    expect(b.grad).toBeCloseTo(a.data + 1, 12);
  });

  it("handles a deep chain without overflowing the stack", () => {
    const start = new Value(1);
    let node = start;
    for (let index = 0; index < 50_000; index += 1) node = node.add(0);
    node.backward();
    expect(start.grad).toBe(1);
  });
});
