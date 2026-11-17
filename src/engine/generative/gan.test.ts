import { createRandom } from "../random";
import { duel, facesDrawn, realPoints, spotOf, SPOTS, testing } from "./gan";

const { createNet, forward, backward } = testing;

describe("the duel's networks", () => {
  it("passes blame back exactly as nudging each number would show", () => {
    const net = createNet([2, 5, 4, 2], createRandom(3));
    const input = [0.3, -0.7];
    // The score: a fixed mix of both outputs.
    const score = (params: Float64Array) => {
      const out = forward({ ...net, params }, input).at(-1) ?? new Float64Array(2);
      return 0.8 * (out[0] ?? 0) - 1.3 * (out[1] ?? 0);
    };
    const grads = new Float64Array(net.params.length);
    const onInput = backward(net, forward(net, input), [0.8, -1.3], grads);
    const nudge = 1e-6;
    for (let index = 0; index < net.params.length; index += 7) {
      const up = Float64Array.from(net.params);
      const down = Float64Array.from(net.params);
      up[index] = (up[index] ?? 0) + nudge;
      down[index] = (down[index] ?? 0) - nudge;
      expect(grads[index]).toBeCloseTo((score(up) - score(down)) / (2 * nudge), 5);
    }
    for (const axis of [0, 1]) {
      const moved = (by: number) => {
        const shifted = [...input];
        shifted[axis] = (shifted[axis] ?? 0) + by;
        const out = forward(net, shifted).at(-1) ?? new Float64Array(2);
        return 0.8 * (out[0] ?? 0) - 1.3 * (out[1] ?? 0);
      };
      expect(onInput[axis]).toBeCloseTo((moved(nudge) - moved(-nudge)) / (2 * nudge), 5);
    }
  });
});

describe("the duel", () => {
  const settings = { forgerRate: 0.004, detectiveRate: 0.004, forgerTries: 1 };

  it("is the same every time for the same settings and seed", () => {
    expect([...duel(settings, 1, 30, 10)]).toEqual([...duel(settings, 1, 30, 10)]);
  });

  it("gives a moment at the start, every few rounds and at the end", () => {
    expect([...duel(settings, 1, 25, 10)].map(({ round }) => round)).toEqual([0, 10, 20, 25]);
  });

  it("teaches a steady forger to draw most of the six faces", () => {
    const last = [...duel(settings, 1, 500, 100)].at(-1);
    expect(facesDrawn(last?.shares ?? [])).toBeGreaterThanOrEqual(4);
  });

  it("knows which spot a point is near", () => {
    const [x, y] = SPOTS[2] ?? [0, 0];
    expect(spotOf(x + 0.05, y)).toBe(2);
    expect(spotOf(0, 0)).toBe(-1);
    expect(realPoints(50).every((value) => Math.abs(value) < 1)).toBe(true);
  });
});
