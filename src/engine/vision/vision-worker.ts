/**
 * The vision worker: loads the self-hosted picture model once, on WebGL when this browser can draw
 * in a worker in time (else on the CPU), and answers pictures. Nothing is fetched from elsewhere.
 */
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import * as tfl from "@tensorflow/tfjs-layers";
import { pickDevice } from "../model/backends/tfjs";
import type { VisionCommand, VisionEvent } from "./protocol";
import { VISION_MODEL_PATH } from "./runtime";
import { createVision, SIDE, type LoadedVision } from "./seeing";

/** A device not ready this long after it starts is passed over for the CPU. */
const VISION_READY_MS = 10_000;

const post = (event: VisionEvent, transfer: Transferable[] = []) =>
  self.postMessage(event, { transfer });

/** Builds the model on a device and reads one blank picture back, so the device really works. */
async function prepare(): Promise<boolean> {
  const base = new URL(VISION_MODEL_PATH, self.location.origin).href;
  const [model, things] = await Promise.all([
    tfl.loadLayersModel(`${base}model.json`),
    fetch(`${base}things.json`).then((response) => {
      if (!response.ok) throw new Error(`The names answered ${response.status}.`);
      return response.json() as Promise<string[]>;
    }),
  ]);
  const vision = createVision(model, things);
  await vision.see(new Uint8ClampedArray(SIDE * SIDE * 4), { maps: true, features: true });
  ready = vision;
  return true;
}

let ready: LoadedVision | null = null;
let loading: Promise<LoadedVision> | null = null;

function load(): Promise<LoadedVision> {
  loading ??= (async () => {
    const device = await pickDevice(
      ["webgl", "cpu"],
      async () => {
        ready?.dispose();
        ready = null;
        return prepare();
      },
      VISION_READY_MS,
    );
    if (!ready) throw new Error("The picture reader did not start.");
    post({ type: "ready", device: `tfjs-${device}` });
    return ready;
  })();
  // A failed load is forgotten, so the next request tries again.
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

self.onmessage = async ({ data: command }: MessageEvent<VisionCommand>) => {
  let vision: LoadedVision;
  try {
    vision = await load();
  } catch (error) {
    post({ type: "error", id: command.id, stage: "load", message: String(error) });
    return;
  }
  try {
    if (command.type === "see") {
      const seen = await vision.see(command.pixels, command);
      const transfer: Transferable[] = [];
      for (const { maps } of seen.maps ?? []) transfer.push(maps.buffer);
      if (seen.features) transfer.push(seen.features.buffer);
      post({ type: "seen", id: command.id, seen }, transfer);
    } else {
      const fooled = await vision.fool(command.pixels, command.strength);
      post({ type: "fooled", id: command.id, fooled }, [fooled.pixels.buffer]);
    }
  } catch (error) {
    post({ type: "error", id: command.id, stage: "see", message: String(error) });
  }
};
