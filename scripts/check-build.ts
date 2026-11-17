/**
 * Runs after `next build`: makes `out/` fit the host and fails the build if it doesn't.
 *
 * - Removes raw TypeScript sources Turbopack copies into `_next/static/media` beside each
 *   `new Worker(new URL("./x.ts", import.meta.url))` (it also builds the real worker chunk). No
 *   browser can run a .ts file, so nothing ever loads them.
 * - Fails on any file over 24 MiB (Cloudflare Pages refuses files over 25 MiB), on two large
 *   files with the same content (a runtime or model shipped twice), and when the ONNX runtime or
 *   the attention model is missing.
 *
 * Usage: tsx scripts/check-build.ts [dir]   (default: out)
 */
import { createHash } from "node:crypto";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { ATTENTION_MODEL, RUNTIME_FILES, RUNTIME_PATH } from "../src/engine/pretrained/runtime";

export const MAX_FILE_BYTES = 24 * 1024 * 1024;
/** Next.js writes small identical files on purpose (route payloads, 404 pages); weight matters. */
export const DUPLICATE_MIN_BYTES = 1024 * 1024;
export const REQUIRED = [
  ...Object.values(RUNTIME_FILES).map((file) => `${RUNTIME_PATH}${file}`),
  `/models/${ATTENTION_MODEL}/config.json`,
  `/models/${ATTENTION_MODEL}/tokenizer.json`,
  `/models/${ATTENTION_MODEL}/onnx/model_quantized.onnx`,
  "/_headers",
];

async function* files(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

const urlPath = (root: string, path: string) => `/${relative(root, path).split(sep).join("/")}`;

/** Deletes `_next/static/media/*.ts` and returns their paths. */
export async function pruneSources(root: string): Promise<string[]> {
  const media = join(root, "_next", "static", "media");
  const pruned: string[] = [];
  for (const entry of await readdir(media).catch(() => [])) {
    if (!/\.(m|c)?tsx?$/.test(entry)) continue;
    await rm(join(media, entry));
    pruned.push(urlPath(root, join(media, entry)));
  }
  return pruned;
}

/** Every problem with the export, as plain sentences; empty when it is fit to deploy. */
export async function checkBuild(root: string): Promise<string[]> {
  const problems: string[] = [];
  const bySha = new Map<string, string[]>();
  const seen = new Set<string>();
  for await (const path of files(root)) {
    const name = urlPath(root, path);
    seen.add(name);
    const { size } = await stat(path);
    if (size > MAX_FILE_BYTES) {
      problems.push(`${name} is ${(size / 2 ** 20).toFixed(1)} MiB, over the 24 MiB limit.`);
    }
    if (size >= DUPLICATE_MIN_BYTES) {
      const sha = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
      bySha.set(sha, [...(bySha.get(sha) ?? []), name]);
    }
  }
  for (const names of bySha.values()) {
    if (names.length > 1) problems.push(`Shipped more than once: ${names.sort().join(", ")}.`);
  }
  for (const name of REQUIRED) {
    if (!seen.has(name)) problems.push(`${name} is missing.`);
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = process.argv[2] ?? "out";
  for (const path of await pruneSources(root)) console.log(`check-build: removed ${path}`);
  const problems = await checkBuild(root);
  for (const problem of problems) console.error(`check-build: ${problem}`);
  if (problems.length === 0) console.log(`check-build: ${root}/ is fit to deploy.`);
  process.exitCode = problems.length > 0 ? 1 : 0;
}
