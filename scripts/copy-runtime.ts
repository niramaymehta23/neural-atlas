/**
 * Copies the ONNX runtime that Transformers.js needs into public/models/ort/, so the attention
 * lesson never fetches it cross-origin (the site is cross-origin isolated). Runs before dev and
 * build; the copies are gitignored because node_modules owns them.
 */
import { copyFile, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { RUNTIME_FILES, RUNTIME_PATH } from "../src/engine/pretrained/runtime";

const TARGET = join("public", RUNTIME_PATH);

const require = createRequire(import.meta.url);
// onnxruntime-web is Transformers.js's dependency, so resolve it from there.
const fromTransformers = createRequire(require.resolve("@huggingface/transformers"));
const source = dirname(fromTransformers.resolve("onnxruntime-web"));

const sameSize = async (from: string, to: string) => {
  const [a, b] = await Promise.all([stat(from), stat(to).catch(() => null)]);
  return b?.size === a.size;
};

await mkdir(TARGET, { recursive: true });
for (const file of Object.values(RUNTIME_FILES)) {
  const from = join(source, file);
  const to = join(TARGET, file);
  if (!(await sameSize(from, to))) await copyFile(from, to);
}
