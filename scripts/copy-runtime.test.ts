// @vitest-environment node
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RUNTIME_FILES, RUNTIME_VERSION } from "../src/engine/pretrained/runtime";
import { findRuntime, syncRuntime } from "./copy-runtime";

async function fakeDist(contents = "a") {
  const root = await mkdtemp(join(tmpdir(), "ort-"));
  const dist = join(root, "dist");
  await mkdir(dist);
  for (const file of Object.values(RUNTIME_FILES)) await writeFile(join(dist, file), contents);
  return { root, source: { dist, version: RUNTIME_VERSION } };
}

describe("copy-runtime", () => {
  it("names the onnxruntime-web version that is installed", async () => {
    expect((await findRuntime()).version).toBe(RUNTIME_VERSION);
  });

  it("copies by content, so a same-size change is still copied", async () => {
    const { root, source } = await fakeDist("aaaa");
    const target = join(root, "public", `ort-${RUNTIME_VERSION}`);
    expect(await syncRuntime(source, target)).toHaveLength(2);
    expect(await syncRuntime(source, target)).toEqual([]);

    await writeFile(join(source.dist, RUNTIME_FILES.wasm), "bbbb");
    expect(await syncRuntime(source, target)).toEqual([RUNTIME_FILES.wasm]);
    expect(await readFile(join(target, RUNTIME_FILES.wasm), "utf8")).toBe("bbbb");
  });

  it("fails when the installed runtime is not the version runtime.ts names", async () => {
    const { root, source } = await fakeDist();
    await expect(syncRuntime({ ...source, version: "9.9.9" }, join(root, "t"))).rejects.toThrow(
      /onnxruntime-web is 9\.9\.9/,
    );
  });

  it("fails when a runtime file is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "ort-"));
    await expect(
      syncRuntime({ dist: root, version: RUNTIME_VERSION }, join(root, "t")),
    ).rejects.toThrow(/is missing/);
  });

  it("removes runtime folders left by an older version", async () => {
    const { root, source } = await fakeDist();
    const models = join(root, "public");
    await mkdir(join(models, "ort"), { recursive: true });
    await mkdir(join(models, "ort-1.0.0"));
    await mkdir(join(models, "attention-minilm-v1"));
    // RUNTIME_PATH ends in a slash; the fresh copy must survive the clean-up.
    await syncRuntime(source, join(models, `ort-${RUNTIME_VERSION}/`));
    expect((await readdir(models)).sort()).toEqual(
      ["attention-minilm-v1", `ort-${RUNTIME_VERSION}`].sort(),
    );
    expect((await stat(join(models, "attention-minilm-v1"))).isDirectory()).toBe(true);
  });
});
