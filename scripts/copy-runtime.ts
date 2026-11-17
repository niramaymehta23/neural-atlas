/**
 * Copies the ONNX runtime that Transformers.js needs into public/models/ort-<version>/, so the
 * attention lesson never fetches it cross-origin (the site is cross-origin isolated). Runs before
 * dev and build, and fails them when the runtime is missing or not the version runtime.ts names.
 * The copies are gitignored because node_modules owns them.
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { RUNTIME_FILES, RUNTIME_PATH, RUNTIME_VERSION } from "../src/engine/pretrained/runtime";

const sha256 = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const sha256OrNull = (path: string) => sha256(path).catch(() => null);

export type RuntimeSource = { dist: string; version: string };

/** onnxruntime-web as Transformers.js resolves it (it is Transformers.js's dependency, not ours). */
export async function findRuntime(): Promise<RuntimeSource> {
  const require = createRequire(import.meta.url);
  const fromTransformers = createRequire(require.resolve("@huggingface/transformers"));
  const dist = dirname(fromTransformers.resolve("onnxruntime-web"));
  const { version } = JSON.parse(await readFile(join(dist, "..", "package.json"), "utf8")) as {
    version: string;
  };
  return { dist, version };
}

/**
 * Makes `target` hold exactly the runtime files, copying any whose content differs, and removes
 * runtime folders left by older versions beside it. Throws on a version mismatch or missing file.
 */
export async function syncRuntime(
  { dist, version }: RuntimeSource,
  target: string,
  expected = RUNTIME_VERSION,
): Promise<string[]> {
  if (version !== expected) {
    throw new Error(
      `onnxruntime-web is ${version} but src/engine/pretrained/runtime.ts names ${expected}. ` +
        "Update RUNTIME_VERSION there (the served folder is named after it).",
    );
  }
  const copied: string[] = [];
  await mkdir(target, { recursive: true });
  for (const file of Object.values(RUNTIME_FILES)) {
    const from = join(dist, file);
    const want = await sha256OrNull(from);
    if (!want) throw new Error(`The ONNX runtime file ${from} is missing; reinstall dependencies.`);
    if (want !== (await sha256OrNull(join(target, file)))) {
      await copyFile(from, join(target, file));
      copied.push(file);
    }
  }
  const parent = dirname(target);
  const own = basename(target);
  for (const entry of await readdir(parent)) {
    if (/^ort($|-)/.test(entry) && entry !== own)
      await rm(join(parent, entry), { recursive: true });
  }
  return copied;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await syncRuntime(await findRuntime(), join("public", RUNTIME_PATH));
  } catch (error) {
    console.error(`copy-runtime: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
