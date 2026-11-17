/**
 * The worker side of the map, kept free of `self` so tests can drive it in-process: it steps the
 * map in short slices, giving way between them so a pause arrives, and posts a frame every
 * RECORD_EVERY steps.
 */
import { createMap, spacing, type MapRun } from "./tsne";
import { RECORD_EVERY, type MapCommand, type MapEvent } from "./tsne-protocol";

/** Work done before giving way, so a pause or a new run is heard quickly. */
const SLICE_MS = 12;

export function createMapHost(
  post: (event: MapEvent, transfer?: Transferable[]) => void,
  later: (next: () => void) => void = (next) => setTimeout(next, 0),
  now: () => number = () => performance.now(),
) {
  let run = -1;
  let map: MapRun | null = null;
  let until = 0;
  let stepping = false;

  const frame = () => {
    if (!map) return;
    const positions = Float32Array.from(map.positions);
    post(
      {
        type: "frame",
        run,
        step: map.step,
        positions,
        cost: map.step === 0 ? 0 : map.cost,
        spacing: spacing(map.positions),
      },
      [positions.buffer],
    );
  };

  const slice = () => {
    const current = map;
    if (!current || !stepping) return;
    const started = now();
    while (current.step < until && now() - started < SLICE_MS) {
      current.advance();
      if (current.step % RECORD_EVERY === 0) frame();
    }
    if (current.step >= until) {
      stepping = false;
      post({ type: "stopped", run, step: current.step });
      return;
    }
    const mine = current;
    later(() => {
      if (map === mine) slice();
    });
  };

  return (command: MapCommand) => {
    try {
      if (command.type === "start") {
        run = command.run;
        stepping = false;
        map = createMap(command.data, command.dims, {
          perplexity: command.perplexity,
          seed: command.seed,
        });
        until = 0;
        frame();
        return;
      }
      if (command.run !== run || !map) return;
      if (command.type === "pause") {
        if (!stepping) return;
        stepping = false;
        post({ type: "stopped", run, step: map.step });
        return;
      }
      until = command.until;
      if (stepping) return;
      if (map.step >= until) {
        post({ type: "stopped", run, step: map.step });
        return;
      }
      stepping = true;
      slice();
    } catch (error) {
      stepping = false;
      post({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };
}
