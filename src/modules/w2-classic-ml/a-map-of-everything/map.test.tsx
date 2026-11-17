import { Component, type ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { createMap, spacing } from "@/engine/ml/tsne";
import type { MapPort } from "@/engine/ml/tsne-client";
import { createMapHost } from "@/engine/ml/tsne-host";
import type { MapCommand, MapEvent } from "@/engine/ml/tsne-protocol";
import { Timeline } from "@/engine/timeline/timeline";
import type { Update } from "@/platform/contract";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { DIMS, mapConnection, runKeyOf, thingsOf, type MapFrame, type MapState } from "./model";
import { predictions } from "./predictions";
import { MapScene } from "./scene";

class Catch extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    return this.state.error ? <p>{this.state.error.message}</p> : this.props.children;
  }
}

const state = (change: Partial<MapState> = {}) =>
  ({ ...definition.initialState, ...change }) as MapState;
const [mission] = missions;
const [prediction] = predictions;

/** Settles a map straight here (no worker) and reads it as the newest recorded moment. */
function settle(now: MapState): MapFrame {
  const map = createMap(thingsOf(now.data, now.count).values, DIMS, {
    perplexity: now.perplexity,
    seed: 31 + now.attempt,
  });
  while (map.step < now.steps) map.advance();
  return {
    epoch: map.step,
    loss: map.cost,
    positions: Float32Array.from(map.positions),
    spacing: spacing(map.positions),
    run: runKeyOf(now),
  };
}

describe("a map of everything", () => {
  it("sorts the zoo into islands, and draws islands from noise only with few neighbours", () => {
    const zoo = state({ count: 200, steps: 600 });
    expect(settle(zoo).spacing).toBeLessThan(0.65);
    const fake = state({ data: "noise", count: 200, perplexity: 2, steps: 800 });
    const fakeFrame = settle(fake);
    expect(mission.when(fake, fakeFrame)).toBe(true);
    expect(prediction.answer(fake, fakeFrame)).toBe("islands");
    const honest = state({ data: "noise", count: 200, perplexity: 40, steps: 600 });
    expect(mission.when(honest, settle(honest))).toBe(false);
  });

  it("waits for a settled map of noise with few neighbours before telling the guess", () => {
    const early = state({ data: "noise", count: 200, perplexity: 2, steps: 300 });
    expect(prediction.answer(early, settle(early))).toBeNull();
    const zoo = state({ count: 200, perplexity: 2, steps: 800 });
    expect(prediction.answer(zoo, settle(zoo))).toBeNull();
    // A moment from another map never counts.
    const fake = state({ data: "noise", count: 200, perplexity: 2, steps: 800 });
    expect(mission.when({ ...fake, attempt: 1 }, settle(fake))).toBe(false);
  });

  it("makes a hand-made link safe and never starts it running", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = {
      data: "stars",
      count: 1e6,
      perplexity: 0,
      steps: 4000,
      attempt: -1,
      running: true,
    };
    expect(parse(saved as never, definition.initialState)).toEqual({
      data: "zoo",
      count: 1000,
      perplexity: 2,
      steps: 1000,
      attempt: 0,
      running: false,
    });
    expect(parse({ ...definition.initialState, count: 437 }, definition.initialState).count).toBe(
      400,
    );
  });

  describe("in the worker", () => {
    const queue: (() => void)[] = [];
    let clock = 0;
    beforeEach(() => {
      mapConnection.connect = () => {
        const port: MapPort = {
          postMessage: (command: MapCommand) => handle(command),
          onmessage: null,
          terminate: () => {},
        };
        const handle = createMapHost(
          (event: MapEvent) => port.onmessage?.({ data: event } as MessageEvent<MapEvent>),
          (next) => queue.push(next),
          () => (clock += 5),
        );
        return port;
      };
    });
    afterEach(() => {
      mapConnection.connect = undefined;
      queue.length = 0;
    });
    const drain = () =>
      act(() => {
        while (queue.length) queue.shift()?.();
      });

    it("redraws a link's map up to its saved step, every tenth step on the timeline", () => {
      const timeline = new Timeline<MapFrame>();
      let now = state({ count: 200, steps: 40 });
      const update: Update<MapState> = (change) => {
        now = { ...now, ...(typeof change === "function" ? change(now) : change) };
      };
      render(<MapScene state={now} update={update} timeline={timeline} side="main" />);
      drain();
      expect(timeline.frames().map((frame) => frame.epoch)).toEqual([0, 10, 20, 30, 40]);
      expect(now.steps).toBe(40);
      expect(now.running).toBe(false);
      const describe = definition.describe;
      if (!describe) throw new Error("describe is required");
      expect(describe(now, timeline.frames().at(-1))).toContain(words.status.pulling);
    });

    it("hands a worker failure to the error boundary", async () => {
      mapConnection.connect = () => {
        throw new Error("no worker here");
      };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <Catch>
          <MapScene state={state()} update={() => {}} timeline={new Timeline()} side="main" />
        </Catch>,
      );
      expect(await screen.findByText("no worker here")).toBeInTheDocument();
      spy.mockRestore();
    });
  });
});
