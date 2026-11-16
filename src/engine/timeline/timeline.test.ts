import { binaryCrossEntropy, mean } from "../autodiff/losses";
import { MLP, readParameters, writeParameters } from "../autodiff/nn";
import { createOptimiser, zeroGrad } from "../autodiff/optimisers";
import { createRandom } from "../random";
import { Timeline } from "./timeline";

type Snapshot = { epoch: number; loss: number; params: Float64Array };
const XOR: [number[], number][] = [
  [[0, 0], 0],
  [[0, 1], 1],
  [[1, 0], 1],
  [[1, 1], 0],
];

function lossOf(mlp: MLP) {
  return mean(XOR.map(([input, target]) => binaryCrossEntropy(mlp.call(input)[0]!, target)));
}

/** Trains XOR, recording every epoch, and returns the model and its timeline. */
function trainRun(seed: number, epochs: number, timeline = new Timeline<Snapshot>()) {
  const mlp = new MLP({ sizes: [2, 4, 1], activation: "tanh" }, createRandom(seed));
  const params = mlp.parameters();
  const optimiser = createOptimiser({ kind: "adam", learningRate: 0.05 });
  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const loss = lossOf(mlp);
    timeline.record({ epoch, loss: loss.data, params: readParameters(params) });
    zeroGrad(params);
    loss.backward();
    optimiser.step(params);
  }
  return { mlp, timeline };
}

const frame = (epoch: number) => ({ epoch });

describe("Timeline", () => {
  it("scrubs to epoch n and restoring that snapshot reproduces its loss exactly", () => {
    const { mlp, timeline } = trainRun(4, 60);
    const snapshot = timeline.scrub(23);
    expect(snapshot?.epoch).toBe(23);
    writeParameters(mlp.parameters(), snapshot!.params);
    expect(lossOf(mlp).data).toBe(snapshot!.loss);
    expect(timeline.getState()).toMatchObject({ cursor: 23, playing: false, live: false });
  });

  it("replays the same run identically from the same seed", () => {
    const losses = (seed: number) =>
      trainRun(seed, 40)
        .timeline.frames()
        .map(({ loss }) => loss);
    expect(losses(9)).toEqual(losses(9));
    expect(losses(9)).not.toEqual(losses(10));
    expect(losses(9).at(-1)).toBeLessThan(losses(9)[0]!);
  });

  it("keeps only the newest frames when full, and a scrubbed view stays put", () => {
    const timeline = new Timeline<{ epoch: number }>({ capacity: 5 });
    for (let epoch = 0; epoch < 8; epoch += 1) timeline.record(frame(epoch));
    expect(timeline.frames().map(({ epoch }) => epoch)).toEqual([3, 4, 5, 6, 7]);
    expect(timeline.scrub(1)?.epoch).toBe(3);
    timeline.stepForward();
    expect(timeline.current()?.epoch).toBe(4);
    timeline.record(frame(8));
    expect(timeline.current()?.epoch).toBe(4);
    timeline.stepBack();
    timeline.stepBack();
    expect(timeline.current()?.epoch).toBe(4);
    timeline.goLive();
    timeline.record(frame(9));
    expect(timeline.current()?.epoch).toBe(9);
  });

  it("plays at its frame rate and goes live at the end", () => {
    const timeline = new Timeline<{ epoch: number }>({ framesPerSecond: 10 });
    for (let epoch = 0; epoch < 20; epoch += 1) timeline.record(frame(epoch * 5));
    timeline.seek(0);
    timeline.play();
    timeline.tick(0.25);
    expect(timeline.current()?.epoch).toBe(10);
    timeline.pause();
    timeline.tick(1);
    expect(timeline.current()?.epoch).toBe(10);
    timeline.play();
    timeline.tick(5);
    expect(timeline.getState()).toMatchObject({ live: true, playing: false, cursor: 19 });
  });

  it("plays the ghost run in sync with the current one", () => {
    const timeline = new Timeline<Snapshot>();
    trainRun(1, 30, timeline);
    const previous = timeline.frames();
    timeline.newRun();
    expect(timeline.getState()).toMatchObject({ length: 0, hasGhost: true });
    timeline.newRun();
    expect(timeline.ghostFrames()).toEqual(previous);
    trainRun(2, 30, timeline);
    timeline.seek(0);
    timeline.play();
    for (let tick = 0; tick < 20; tick += 1) {
      timeline.tick(1 / 60);
      const epoch = timeline.current()!.epoch;
      expect(timeline.ghostAt(epoch)).toBe(previous[epoch]);
    }
    expect(timeline.ghostAt(-1)).toBeUndefined();
  });

  it("notifies subscribers with a stable state object", () => {
    const timeline = new Timeline<{ epoch: number }>();
    const listener = vi.fn();
    const stop = timeline.subscribe(listener);
    const before = timeline.getState();
    expect(timeline.getState()).toBe(before);
    timeline.record(frame(0));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(timeline.getState()).not.toBe(before);
    stop();
    timeline.record(frame(1));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
