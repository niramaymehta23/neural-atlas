import {
  createAdam,
  accumulate,
  freshGpt,
  layout,
  nextScores,
  scoresOf,
  surpriseOf,
  trainStep,
  type GptShape,
} from "./tiny-gpt";

const SMALL: GptShape = { vocab: 7, context: 6, width: 8, heads: 2, layers: 2 };

describe("tiny GPT", () => {
  it("lays out every tensor once", () => {
    const { total, entries } = layout(SMALL);
    expect(entries.reduce((sum, [, size]) => sum + size, 0)).toBe(total);
  });

  it("only looks backwards: later pieces never change earlier scores", () => {
    const model = freshGpt(SMALL, 3, "64");
    const a = scoresOf(model, [1, 2, 3]);
    const b = scoresOf(model, [1, 2, 5, 6]);
    expect(Array.from(b.subarray(0, 14))).toEqual(Array.from(a.subarray(0, 14)));
    expect(Array.from(nextScores(model, [1, 2, 3]))).toEqual(Array.from(a.subarray(14, 21)));
  });

  it("works out every gradient as small nudges do", () => {
    const model = freshGpt(SMALL, 11, "64");
    // Bigger random weights, so every part (attention included) has a real slope to check.
    for (let i = 0; i < model.params.length; i += 1)
      model.params[i] = (model.params[i] ?? 0) * 15 + (i % 3 === 0 ? 0.05 : 0);
    const sequence = [0, 3, 6, 2, 2, 5];
    const grads = new Float64Array(model.params.length);
    accumulate(model, sequence, grads);
    const nudge = 1e-6;
    let worst = 0;
    for (let i = 0; i < model.params.length; i += 7) {
      const kept = model.params[i] ?? 0;
      model.params[i] = kept + nudge;
      const up = surpriseOf(model, sequence);
      model.params[i] = kept - nudge;
      const down = surpriseOf(model, sequence);
      model.params[i] = kept;
      const numeric = (up - down) / (2 * nudge);
      worst = Math.max(
        worst,
        Math.abs(numeric - (grads[i] ?? 0)) /
          Math.max(1e-4, Math.abs(numeric) + Math.abs(grads[i] ?? 0)),
      );
    }
    expect(worst).toBeLessThan(1e-4);
  });

  it("lowers its surprise as it practises, the same way every time (fixed seed)", () => {
    const practise = () => {
      const model = freshGpt(SMALL, 5);
      const adam = createAdam(model);
      const batch = [
        [0, 1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5, 6],
      ];
      const losses = Array.from({ length: 60 }, () =>
        trainStep(model, adam, batch, { learningRate: 0.01 }),
      );
      return losses;
    };
    const losses = practise();
    expect(losses[0]).toBeGreaterThan(1.8);
    expect(losses.at(-1)).toBeLessThan(0.3);
    expect(practise()).toEqual(losses);
  });

  it("refuses pieces it does not know and readings that are too long", () => {
    const model = freshGpt(SMALL, 1);
    expect(() => scoresOf(model, [9])).toThrow();
    expect(() => scoresOf(model, [1, 1, 1, 1, 1, 1, 1])).toThrow();
    expect(nextScores(model, [1, 1, 1, 1, 1, 1, 1, 1])).toHaveLength(7);
  });
});
