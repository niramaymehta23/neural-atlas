// @vitest-environment node
import { createRandom } from "../random";
import { createMap } from "./tsne";
import { MapClient, type MapPort } from "./tsne-client";
import { createMapHost } from "./tsne-host";
import { RECORD_EVERY, type MapCommand, type MapEvent } from "./tsne-protocol";

const DATA = (() => {
  const random = createRandom(2);
  return Float64Array.from({ length: 30 * 4 }, () => random.normal());
})();

/** The host wired to a client in-process, with the host's "give way" queued by hand. */
function wire() {
  const queue: (() => void)[] = [];
  let clock = 0;
  const port: MapPort = {
    postMessage: (command: MapCommand) => handle(command),
    onmessage: null,
    terminate: () => {},
  };
  const handle = createMapHost(
    (event: MapEvent) => port.onmessage?.({ data: event } as MessageEvent<MapEvent>),
    (next) => queue.push(next),
    // Each look at the clock is 5 ms later, so a slice takes a few steps and then gives way.
    () => (clock += 5),
  );
  const drain = () => {
    while (queue.length) queue.shift()?.();
  };
  return { port, drain };
}

describe("map worker", () => {
  it("steps in slices, records every tenth step, and lands where one straight run lands", () => {
    const { port, drain } = wire();
    const frames: { step: number; positions: Float32Array }[] = [];
    let stopped = -1;
    const client = new MapClient(
      {
        onFrame: (frame) => frames.push(frame),
        onStopped: (step) => (stopped = step),
        onError: (message) => {
          throw new Error(message);
        },
      },
      () => port,
    );
    client.start(DATA, 4, 5, 9);
    client.go(30);
    drain();
    expect(stopped).toBe(30);
    expect(frames.map((frame) => frame.step)).toEqual([0, 10, 20, 30]);
    const straight = createMap(DATA, 4, { perplexity: 5, seed: 9 });
    for (let step = 0; step < 30; step += 1) straight.advance();
    expect(Array.from(frames.at(-1)?.positions ?? [])).toEqual(
      Array.from(Float32Array.from(straight.positions)),
    );
    expect(RECORD_EVERY).toBe(10);
  });

  it("a pause stops it between slices; going again carries on to the same place", () => {
    const { port, drain } = wire();
    const steps: number[] = [];
    const client = new MapClient(
      { onFrame: () => {}, onStopped: (step) => steps.push(step), onError: () => {} },
      () => port,
    );
    client.start(DATA, 4, 5, 9);
    client.go(40);
    client.pause();
    drain();
    expect(steps).toHaveLength(1);
    expect(steps[0]).toBeLessThan(40);
    client.go(40);
    drain();
    expect(steps.at(-1)).toBe(40);
  });

  it("a new run ignores the old run's messages", () => {
    const { port, drain } = wire();
    const seen: number[] = [];
    const client = new MapClient(
      { onFrame: (frame) => seen.push(frame.run), onError: () => {} },
      () => port,
    );
    client.start(DATA, 4, 5, 9);
    client.go(20);
    client.start(DATA, 4, 5, 10);
    drain();
    expect(new Set(seen.slice(1))).toEqual(new Set([2]));
  });

  it("reports a worker that cannot start", async () => {
    const errors: string[] = [];
    new MapClient({ onFrame: () => {}, onError: (message) => errors.push(message) }, () => {
      throw new Error("no workers here");
    });
    await Promise.resolve();
    expect(errors).toEqual(["no workers here"]);
  });

  it("reports bad input as an error, not a crash", () => {
    const events: MapEvent[] = [];
    const handle = createMapHost((event) => events.push(event));
    handle({
      type: "start",
      run: 1,
      data: new Float64Array([1, 2, 3]),
      dims: 0,
      perplexity: 5,
      seed: 1,
    });
    expect(events.some((event) => event.type === "error")).toBe(true);
  });
});
