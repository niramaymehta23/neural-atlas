// @vitest-environment node
import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkBuild, MAX_FILE_BYTES, pruneSources, REQUIRED } from "./check-build";

async function exportWith(extra: Record<string, string | Buffer> = {}) {
  const root = await mkdtemp(join(tmpdir(), "out-"));
  const files = { ...Object.fromEntries(REQUIRED.map((path) => [path, path])), ...extra };
  for (const [path, body] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), body);
  }
  return root;
}

describe("check-build", () => {
  it("passes an export with the runtime and model, once each", async () => {
    expect(await checkBuild(await exportWith())).toEqual([]);
  });

  it("fails on a file over 24 MiB", async () => {
    const root = await exportWith({
      "/_next/static/media/big.wasm": Buffer.alloc(MAX_FILE_BYTES + 1),
    });
    expect(await checkBuild(root)).toEqual([
      "/_next/static/media/big.wasm is 24.0 MiB, over the 24 MiB limit.",
    ]);
  });

  it("fails when a large file ships twice", async () => {
    const runtime = Buffer.alloc(2 * 1024 * 1024, 7);
    const root = await exportWith({
      "/models/ort-1/a.wasm": runtime,
      "/_next/static/media/a.123.wasm": runtime,
    });
    expect(await checkBuild(root)).toEqual([
      "Shipped more than once: /_next/static/media/a.123.wasm, /models/ort-1/a.wasm.",
    ]);
  });

  it("allows small identical files, which Next.js writes on purpose", async () => {
    const root = await exportWith({ "/404.html": "gone", "/_not-found.html": "gone" });
    expect(await checkBuild(root)).toEqual([]);
  });

  it("fails when the runtime or the model is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "out-"));
    expect(await checkBuild(root)).toEqual(REQUIRED.map((path) => `${path} is missing.`));
  });

  it("removes raw TypeScript sources from the media folder only", async () => {
    const root = await exportWith({
      "/_next/static/media/worker.abc.ts": "self.onmessage = null;",
      "/_next/static/media/font.woff2": "font",
      "/_next/static/chunks/keep.ts.js": "chunk",
    });
    expect(await pruneSources(root)).toEqual(["/_next/static/media/worker.abc.ts"]);
    expect(await readdir(join(root, "_next/static/media"))).toEqual(["font.woff2"]);
    expect(await readdir(join(root, "_next/static/chunks"))).toEqual(["keep.ts.js"]);
  });
});
