/**
 * The real picture model and sample photos for Node tests (TensorFlow.js on the CPU). The photos
 * here are raw RGB copies of three files in public/models/photos-v1 (Node has no JPEG reader).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs-core";
import * as tfl from "@tensorflow/tfjs-layers";
import { createVision, PIXELS, type LoadedVision } from "../seeing";

const folder = join(process.cwd(), "public", "models", "mobilenet-v1-025-v1");

export const things = JSON.parse(readFileSync(join(folder, "things.json"), "utf8")) as string[];

export async function nodeVision(): Promise<LoadedVision> {
  await tf.setBackend("cpu");
  const json = JSON.parse(readFileSync(join(folder, "model.json"), "utf8")) as {
    modelTopology: object;
    weightsManifest: { weights: tf.io.WeightsManifestEntry[] }[];
  };
  const bytes = readFileSync(join(folder, "weights.bin"));
  const model = await tfl.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: json.modelTopology,
      weightSpecs: json.weightsManifest.flatMap(({ weights }) => weights),
      weightData: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
    }),
  );
  return createVision(model, things);
}

/** A sample photo as RGBA bytes: "cat", "dog" or "teapot". */
export function samplePhoto(name: "cat" | "dog" | "teapot"): Uint8ClampedArray {
  const rgb = readFileSync(join(__dirname, `${name}.rgb`));
  const rgba = new Uint8ClampedArray(PIXELS * 4);
  for (let spot = 0; spot < PIXELS; spot += 1) {
    rgba[spot * 4] = rgb[spot * 3] ?? 0;
    rgba[spot * 4 + 1] = rgb[spot * 3 + 1] ?? 0;
    rgba[spot * 4 + 2] = rgb[spot * 3 + 2] ?? 0;
    rgba[spot * 4 + 3] = 255;
  }
  return rgba;
}
