/**
 * Records the real model's reading of the attention lesson's example sentence into
 * src/engine/pretrained/testing/example-reading.json, so unit tests check the lesson against
 * what the model really does. Re-run after the model changes: pnpm tsx scripts/record-attention-fixture.ts
 */
import { writeFile } from "node:fs/promises";
import { words } from "../src/modules/w5-transformers/who-is-looking-at-whom/captions";
import { storeReading } from "../src/engine/pretrained/testing/fixture";
import { nodeSession } from "../src/engine/pretrained/testing/node-model";

const reading = await nodeSession().read(words.example);
const target = new URL("../src/engine/pretrained/testing/example-reading.json", import.meta.url);
await writeFile(target, `${JSON.stringify(storeReading(words.example, reading))}\n`);
console.log(`Recorded ${reading.words.length} words, ${reading.layers} × ${reading.heads}.`);
