/**
 * Rebuilds public/models/mobilenet-v1-025-v1/ from the TensorFlow.js model store: MobileNet v1,
 * width 0.25, 224 × 224 pictures, Apache-2.0 (tensorflow/tfjs-models). The store splits the weights
 * into 55 small files; this joins them, in manifest order, into one `weights.bin` and points
 * `model.json` at it. Every download is checked against the SHA-256 pinned below, so the files it
 * writes are the same byte for byte. It also writes `things.json`, the first everyday name of each
 * of the 1,000 things the model knows, from tfjs-models' `imagenet_classes.ts` at a pinned commit.
 *
 * Usage: pnpm tsx scripts/export-vision-model.ts
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const STORE = "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224";
const MODELS_COMMIT = "e80d693bb43cb0ef234b808021c4def434ea816a";
const CLASSES = `https://raw.githubusercontent.com/tensorflow/tfjs-models/${MODELS_COMMIT}/mobilenet/src/imagenet_classes.ts`;
const LICENSE = `https://raw.githubusercontent.com/tensorflow/tfjs-models/${MODELS_COMMIT}/LICENSE`;
const OUT = join("public", "models", "mobilenet-v1-025-v1");

/** SHA-256 of each download; empty strings print the real values instead of failing. */
const PINNED = {
  modelJson: "d14c680e069d74143e3771c291cf3fd153ee88b6ea9ee44bfaf84e2008ded44e",
  shards: "eb49857447f6089e7e392f7991f3f4fdce1936efaf83d535f5eb8aaba9538e0b",
  classes: "9a8682836352885d11eb80a3e73cd0445a94161b922b1f986aeb9fa846596e28",
  license: "58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd",
};

const sha256 = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");

async function fetchChecked(url: string, pinned: string, name: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const body = new Uint8Array(await response.arrayBuffer());
  check(body, pinned, name);
  return body;
}

function check(body: Uint8Array, pinned: string, name: string) {
  const actual = sha256(body);
  if (pinned === "") console.log(`pin ${name}: ${actual}`);
  else if (actual !== pinned) throw new Error(`${name} changed: ${actual}, expected ${pinned}`);
}

type Manifest = { paths: string[]; weights: unknown[] }[];

const modelBytes = await fetchChecked(`${STORE}/model.json`, PINNED.modelJson, "model.json");
const model = JSON.parse(new TextDecoder().decode(modelBytes)) as {
  modelTopology: unknown;
  weightsManifest: Manifest;
};
const parts: Uint8Array[] = [];
for (const group of model.weightsManifest) {
  for (const path of group.paths) {
    const response = await fetch(`${STORE}/${path}`);
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    parts.push(new Uint8Array(await response.arrayBuffer()));
  }
}
const weights = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
let offset = 0;
for (const part of parts) {
  weights.set(part, offset);
  offset += part.length;
}
check(weights, PINNED.shards, "the joined shards");

const classes = new TextDecoder().decode(
  await fetchChecked(CLASSES, PINNED.classes, "imagenet_classes.ts"),
);
const things: string[] = [];
// Long entries run over two lines; the first name is always in the first quoted piece.
for (const [, index, names] of classes.matchAll(/^\s*(\d+):\s*'((?:[^'\\]|\\.)*)'/gm)) {
  // The first of each thing's names, which is the everyday one ("tabby, tabby cat" → "tabby").
  const [first = ""] = (names ?? "").split(",");
  things[Number(index)] = first.replace(/\\'/g, "'").trim();
}
if (things.length !== 1000 || Array.from(things).some((name) => !name)) {
  throw new Error(`expected 1,000 names, found ${things.filter(Boolean).length}`);
}

const joined = {
  modelTopology: model.modelTopology,
  weightsManifest: [
    { paths: ["weights.bin"], weights: model.weightsManifest.flatMap(({ weights }) => weights) },
  ],
};
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "model.json"), `${JSON.stringify(joined)}\n`);
await writeFile(join(OUT, "weights.bin"), weights);
await writeFile(join(OUT, "things.json"), `${JSON.stringify(things)}\n`);
await writeFile(join(OUT, "LICENSE"), await fetchChecked(LICENSE, PINNED.license, "LICENSE"));
for (const name of ["model.json", "weights.bin", "things.json", "LICENSE"]) {
  console.log(`${sha256(await readFile(join(OUT, name)))}  ${name}`);
}
