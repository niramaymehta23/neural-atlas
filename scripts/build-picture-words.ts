/**
 * Builds public/models/picture-words-v1/matcher.json for "Pictures and words together": a small
 * CLIP-style map where photos and captions land near each other when they mean the same thing.
 *
 * Pictures: MobileNet's 256 deep numbers (public/models/mobilenet-v1-025-v1) for each photo in
 * public/models/photos-v1. Words: the average GloVe place of a caption's words
 * (public/models/glove-words-v1). Two small maps, one for each side, are fitted together so each
 * photo lands nearest the captions of its own kind and each caption nearest the photos of its kind
 * (a contrastive fit, as CLIP is trained, in miniature). Only the word map and the photos' finished
 * places are written; the browser needs no picture model.
 *
 *   .venv/bin/python scripts/photo-pixels.py <folder>         (Node has no JPEG reader)
 *   pnpm tsx scripts/build-picture-words.ts <folder>
 *
 * Seeded, on TensorFlow.js's CPU backend: the same file every run on the same machine.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as tf from "@tensorflow/tfjs-core";
import { meaningOf, readWordPlaces, DIMENSIONS } from "../src/engine/language/word-places";
import { PIXELS } from "../src/engine/vision/seeing";
import { nodeVision } from "../src/engine/vision/testing/node-vision";

const ROOT = process.cwd();
const OUT = join(ROOT, "public", "models", "picture-words-v1");
/** Numbers per place on the shared map. */
const SIZE = 32;
const STEPS = 400;
const HEAT = 0.1;

/** What the photos show, and captions of each kind the fit practises on. */
const KINDS: Record<string, string[]> = {
  cat: [
    "a cat",
    "a photo of a cat",
    "a kitten",
    "a sleepy cat",
    "a cat with whiskers",
    "a pet cat",
  ],
  dog: ["a dog", "a photo of a dog", "a puppy", "a happy dog", "a dog with a collar", "a pet dog"],
  flowers: [
    "flowers",
    "a photo of flowers",
    "a blossom",
    "pink petals",
    "spring flowers",
    "a garden flower",
  ],
  bananas: ["bananas", "a bunch of bananas", "yellow fruit", "ripe bananas"],
  teapot: ["a teapot", "a pot of tea", "a china teapot", "a pot for making tea"],
  bicycle: ["a bicycle", "a bike", "a bike to ride", "wheels and pedals"],
};
/** Photo file names (without number or ending) to the kind they show. */
const KIND_OF_STEM: Record<string, string> = {
  cat: "cat",
  cats: "cat",
  dog: "dog",
  dogs: "dog",
  flowers: "flowers",
  bananas: "bananas",
  teapot: "teapot",
  bicycle: "bicycle",
};
const kindOf = (file: string) => KIND_OF_STEM[file.replace(/(-\d+)?\.rgb$/, "")] ?? "";

const rows = (tensor: tf.Tensor2D) => tf.div(tensor, tf.norm(tensor, 2, 1, true));
const round = (values: Iterable<number>) =>
  Array.from(values, (value) => Math.round(value * 1e5) / 1e5);

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error("Give the folder photo-pixels.py wrote.");
  const places = readWordPlaces(
    await readFile(join(ROOT, "public/models/glove-words-v1/words.txt"), "utf8"),
    (await readFile(join(ROOT, "public/models/glove-words-v1/vectors.bin"))).buffer as ArrayBuffer,
  );
  const vision = await nodeVision();
  const files = (await readdir(folder)).filter((file) => file.endsWith(".rgb")).sort();
  const photos: { file: string; kind: string; features: Float32Array }[] = [];
  for (const file of files) {
    const rgb = await readFile(join(folder, file));
    const rgba = new Uint8ClampedArray(PIXELS * 4);
    for (let spot = 0; spot < PIXELS; spot += 1) {
      rgba[spot * 4] = rgb[spot * 3] ?? 0;
      rgba[spot * 4 + 1] = rgb[spot * 3 + 1] ?? 0;
      rgba[spot * 4 + 2] = rgb[spot * 3 + 2] ?? 0;
      rgba[spot * 4 + 3] = 255;
    }
    const seen = await vision.see(rgba, { features: true });
    const kind = kindOf(file);
    if (!seen.features || !KINDS[kind]) throw new Error(`No features or kind for ${file}.`);
    photos.push({ file: file.replace(/\.rgb$/, ".jpg"), kind, features: seen.features });
  }
  const captions = Object.entries(KINDS).flatMap(([kind, list]) =>
    list.map((text) => ({ kind, text })),
  );
  const pictureRows = tf.tensor2d(
    photos.flatMap(({ features }) => [...features]),
    [photos.length, 256],
  );
  const wordRows = tf.tensor2d(
    captions.flatMap(({ text }) => {
      const meaning = meaningOf(places, text);
      if (!meaning) throw new Error(`No known words in "${text}".`);
      return [...meaning];
    }),
    [captions.length, DIMENSIONS],
  );
  // Each photo's target: an even share over the captions of its kind, and the other way round.
  const same = tf.tensor2d(
    photos.flatMap(({ kind }) => captions.map((caption) => (caption.kind === kind ? 1 : 0))),
    [photos.length, captions.length],
  );
  const photoTarget = tf.div(same, tf.sum(same, 1, true));
  const captionTarget = tf.div(tf.transpose(same), tf.sum(tf.transpose(same), 1, true));
  const pictureMap = tf.variable(tf.randomNormal([256, SIZE], 0, 0.05, "float32", 21));
  const wordMap = tf.variable(tf.randomNormal([DIMENSIONS, SIZE], 0, 0.1, "float32", 22));
  const optimiser = tf.train.adam(0.01);
  for (let step = 0; step < STEPS; step += 1) {
    const cost = optimiser.minimize(() => {
      const pictures = rows(tf.matMul(rows(pictureRows), pictureMap));
      const words = rows(tf.matMul(wordRows, wordMap));
      const likeness = tf.div(tf.matMul(pictures, words, false, true), HEAT);
      const photoSide = tf.neg(tf.mean(tf.sum(tf.mul(photoTarget, tf.logSoftmax(likeness, 1)), 1)));
      const captionSide = tf.neg(
        tf.mean(tf.sum(tf.mul(captionTarget, tf.logSoftmax(tf.transpose(likeness), 1)), 1)),
      );
      return tf.add(photoSide, captionSide) as tf.Scalar;
    }, true);
    if (step % 100 === 0 || step === STEPS - 1)
      console.log(`step ${step}: ${cost?.dataSync()[0]?.toFixed(3)}`);
    cost?.dispose();
  }
  const finished = (rows(tf.matMul(rows(pictureRows), pictureMap)) as tf.Tensor2D).arraySync();
  const matcher = {
    size: SIZE,
    wordMap: round(wordMap.dataSync()),
    photos: photos.map(({ file, kind }, at) => ({ file, kind, place: round(finished[at] ?? []) })),
  };
  await mkdir(OUT, { recursive: true });
  const body = `${JSON.stringify(matcher)}\n`;
  await writeFile(join(OUT, "matcher.json"), body);
  console.log(
    `${createHash("sha256").update(body).digest("hex")}  matcher.json  (${body.length} bytes)`,
  );
  vision.dispose();
}

await main();
