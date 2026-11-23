import { gradient, paramCount, predict, type DenseSpec } from "./autodiff/dense";
import { MLP } from "./autodiff/nn";
import type { Value } from "./autodiff/value";
import { createReader, freshGpt, scoresOf } from "./language/tiny-gpt";
import { runRelay } from "./ml/boost";
import { vote } from "./ml/knn";
import { buildRoad } from "./ml/svm";
import { growTree } from "./ml/tree";
import { counting, multiplications, multiplied } from "./multiplications";
import { createRandom } from "./random";
import type { World } from "./rl/gridworld";
import { sweep } from "./rl/mdp";
import { createHabitLearner, returnsOf } from "./rl/policy-gradient";
import { createQRunner } from "./rl/q-learning";
import { createNet, forward } from "./rl/tiny-net";

/** Every "×" in a graph, each once. */
function timesIn(roots: readonly Value[]): number {
  const seen = new Set<Value>();
  const visit = (node: Value): void => {
    if (seen.has(node)) return;
    seen.add(node);
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return [...seen].filter((node) => node.op === "*").length;
}

describe("the compute meter's count", () => {
  it("only ever goes up, by what it is told", () => {
    const before = multiplications();
    multiplied(3);
    expect(multiplications() - before).toBe(3);
    const { result, times } = counting(() => {
      multiplied(5);
      return "done";
    });
    expect([result, times]).toEqual(["done", 5]);
  });

  it("a network's answer costs what its graph of sums says it costs", () => {
    const sizes = [2, 5, 3, 1];
    const spec: DenseSpec = { sizes, bends: ["tanh"], loss: "logistic" };
    const mlp = new MLP({ sizes, activation: "tanh" }, createRandom(1));
    const graph = timesIn(mlp.call([0.3, -0.2]));
    const params = new Float64Array(paramCount(sizes)).fill(0.1);
    const { times } = counting(() => predict(spec, params, [0.3, -0.2]));
    expect(graph).toBe(2 * 5 + 5 * 3 + 3);
    expect(times).toBe(graph);
  });

  it("learning from one dot costs the answer, plus the slopes, plus passing the blame back", () => {
    const spec: DenseSpec = { sizes: [2, 4, 1], bends: ["tanh"], loss: "logistic" };
    const params = new Float64Array(paramCount(spec.sizes)).fill(0.1);
    const { times } = counting(() => gradient(spec, params, { inputs: [0.3, 0.1], targets: [1] }));
    const answer = 2 * 4 + 4;
    const slopes = 2 * 4 + 4;
    const passedBack = 4;
    expect(times).toBe(answer + slopes + passedBack);
  });

  it("the storyteller reading one piece at a time costs less than reading it all again", () => {
    const shape = { vocab: 7, context: 5, width: 8, heads: 2, layers: 1 };
    const gpt = freshGpt(shape, 3);
    const ids = [1, 2, 3, 4];
    const reader = createReader(gpt);
    const piece = counting(() => reader.read(1)).times;
    // codes → three views, look around, mix, think wide, think back, score every word.
    expect(piece).toBe(8 * 24 + 2 * 8 + 8 * 8 + 8 * 32 + 32 * 8 + 8 * 7);
    const again = createReader(gpt);
    const oneByOne = counting(() => ids.forEach((id) => again.read(id))).times;
    const whole = counting(() => scoresOf(gpt, ids)).times;
    expect(oneByOne).toBe(whole);
  });

  it("neighbours, the road and the tiny agents count by hand too", () => {
    const dots = [
      { x: 0, y: 0, label: 0 },
      { x: 1, y: 1, label: 1 },
      { x: -1, y: 0.5, label: 0 },
    ];
    expect(counting(() => vote(dots, 0.2, 0.2, 2)).times).toBe(6);
    // Six pairs (each dot with itself too), two multiplications a pair, then the search.
    expect(
      counting(() => buildRoad(dots, { kernel: "flat", lift: 1, strict: 1, maxSteps: 0 })).times,
    ).toBe(12);
    const runner = createQRunner(
      { columns: 2, rows: 1, tiles: ["floor", "goal"], start: 0 },
      { curiosity: 1, learnRate: 0.5, lookAhead: 0.9 },
      1,
    );
    const { times, result } = counting(() => runner.advance(40));
    // Two a move, but one when the move ends the try.
    expect(times).toBe(2 * 40 - result.length);
    const net = createNet({ inputs: 9, hidden: 4, outputs: 2 }, 1);
    const square = [0, 0, 1, 0, 0, 0, 0, 0, 0];
    expect(counting(() => forward(net, square)).times).toBe(4 + 8);
  });

  it("questions, relays, the planner and the habit follower count by hand", () => {
    // Four dots in a row: three places to cut across, none up or down.
    const row = [0, 1, 2, 3].map((x) => ({ x, y: 0, label: x < 2 ? 0 : 1 }));
    // The box's impurity squares two shares; a cut squares four and weighs two sides.
    expect(counting(() => growTree(row, { depth: 1 })).times).toBe(2 + 3 * (4 + 2));
    // How sure about each dot, the whole, two squares a cut, and the rate on both leaves.
    expect(counting(() => runRelay(row, { runners: 1, depth: 1, rate: 0.5 })).times).toBe(
      4 + 1 + 3 * 2 + 2,
    );
    // One floor square beside the bowl and no sliding: three moves stay, one ends the try.
    const world: World = { columns: 2, rows: 1, tiles: ["floor", "goal"], start: 0 };
    const rules = { slip: 0, stepReward: 0, care: 0.9 };
    expect(counting(() => sweep(world, [0, 0], rules)).times).toBe(3 * 2 + 1);
    expect(counting(() => returnsOf([0, 0, 1], 0.9)).times).toBe(3);
    const learner = createHabitLearner(world, { batch: 1, nudge: 0.5 }, 1);
    const moves = (times: number) => {
      const { result, times: counted } = counting(() => learner.play());
      // Its returns, four moves' shares a step, every preference; then the usual, once known.
      expect(counted).toBe(result.moves.length * 5 + 8 + times);
    };
    moves(0);
    moves(1);
  });
});
