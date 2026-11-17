import {
  accuracy,
  createSequenceTrainer,
  examples,
  lossAndGradient,
  paramCount,
  read,
  remembering,
  startParams,
  type Cell,
} from "./recurrent";

const CELLS: Cell[] = ["plain", "gated"];
const SHUT = { keep: "shut", letIn: "shut", readOut: "shut" } as const;

function practise(cell: Cell, length: number, learningRate: number, rounds = 240) {
  const spec = { cell };
  const trainer = createSequenceTrainer(
    spec,
    startParams(spec, 5, 0.5),
    examples(length, 32, 11),
    learningRate,
  );
  for (let round = 0; round < rounds; round += 1) trainer.round();
  return { spec, params: trainer.params, test: examples(length, 40, 101) };
}

describe("reading one word at a time: the maths", () => {
  it.each(CELLS)("the %s cell's blame matches nudging each number by hand", (cell) => {
    const spec = { cell };
    const params = startParams(spec, 3);
    const data = examples(5, 4, 9);
    const { gradient } = lossAndGradient(spec, params, data);
    expect(gradient).toHaveLength(paramCount(spec));
    for (let index = 0; index < params.length; index += 5) {
      const up = Float64Array.from(params);
      const down = Float64Array.from(params);
      up[index]! += 1e-5;
      down[index]! -= 1e-5;
      const numeric =
        (lossAndGradient(spec, up, data).loss - lossAndGradient(spec, down, data).loss) / 2e-5;
      expect(Math.abs(numeric - gradient[index]!)).toBeLessThan(1e-7);
    }
  });

  it("makes sunny and rainy sentences in pairs that share every other word", () => {
    const pairs = examples(6, 4, 1);
    expect(pairs.map(({ rainy }) => rainy)).toEqual([0, 1, 0, 1]);
    expect(pairs[0]!.sentence.slice(1)).toEqual(pairs[1]!.sentence.slice(1));
    expect(pairs[0]!.sentence).toHaveLength(6);
  });

  it.each(CELLS)("the %s cell practises the same way every time", (cell) => {
    expect(practise(cell, 6, 0.005, 20).params).toEqual(practise(cell, 6, 0.005, 20).params);
  });
});

describe("reading one word at a time: what it can remember", () => {
  it("the plain cell learns short sentences but forgets the start of long ones", () => {
    for (const rate of [0.002, 0.015]) {
      const short = practise("plain", 11, rate);
      expect(accuracy(short.spec, short.params, short.test)).toBeGreaterThan(0.9);
      const long = practise("plain", 12, rate);
      expect(accuracy(long.spec, long.params, long.test)).toBeLessThan(0.65);
    }
  });

  it("the gated cell remembers across even the longest sentence", () => {
    for (const rate of [0.002, 0.015]) {
      const long = practise("gated", 20, rate);
      expect(accuracy(long.spec, long.params, long.test)).toBeGreaterThan(0.9);
    }
  });

  it("with every gate shut, the gated cell can only guess", () => {
    const { spec, params, test } = practise("gated", 14, 0.005);
    expect(accuracy(spec, params, test, SHUT)).toBe(0.5);
    expect(
      read(spec, params, test[0]!.sentence, SHUT).openness.every(({ keep }) => keep === 0),
    ).toBe(true);
  });

  it("its memory of the first word fades in a plain cell and lasts in a gated one", () => {
    const rest = examples(16, 2, 77)[0]!.sentence.slice(1);
    const plain = practise("plain", 16, 0.005);
    const gated = practise("gated", 16, 0.005);
    expect(remembering(plain.spec, plain.params, rest).at(-1)!).toBeLessThan(0.05);
    expect(remembering(gated.spec, gated.params, rest).at(-1)!).toBeGreaterThan(1);
  });
});
