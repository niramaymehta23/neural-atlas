// @vitest-environment node
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkModel, checksums, modelFolders } from "./check-model";

// sha256 of "weights"
const WEIGHTS = "9a129038d9a00aed0cf6a7ea059ca50a813449061ab87848cf1a13eafdf33b2c";

async function folder(readme: string, files: Record<string, string> = {}) {
  const root = await mkdtemp(join(tmpdir(), "model-"));
  await writeFile(join(root, "README.md"), readme);
  for (const [name, body] of Object.entries(files)) {
    await mkdir(join(root, name, ".."), { recursive: true });
    await writeFile(join(root, name), body);
  }
  return root;
}

describe("check-model", () => {
  it("reads sha256sum lines out of a README", () => {
    expect(checksums(`# m\n\n\`\`\`text\n${WEIGHTS}  onnx/m.onnx\n\`\`\`\nnot  a line\n`)).toEqual([
      { sha: WEIGHTS, file: "onnx/m.onnx" },
    ]);
  });

  it("passes when every listed file matches", async () => {
    const root = await folder(`${WEIGHTS}  onnx/m.onnx\n`, { "onnx/m.onnx": "weights" });
    expect(await checkModel(root)).toEqual([]);
  });

  it("fails on a changed or missing file", async () => {
    const root = await folder(`${WEIGHTS}  a.onnx\n${WEIGHTS}  b.onnx\n`, { "a.onnx": "weightz" });
    expect(await checkModel(root)).toEqual([
      `${root}/a.onnx does not match the checksum in its README.`,
      `${root}/b.onnx is missing.`,
    ]);
  });

  it("fails a README without checksums", async () => {
    const root = await folder("# no sums\n");
    expect(await checkModel(root)).toEqual([`${root}/README.md lists no SHA-256 checksums.`]);
  });

  it("checks the committed models, skipping the copied runtime", async () => {
    const folders = await modelFolders("public/models");
    expect(folders).toContain(join("public", "models", "attention-minilm-v1"));
    expect(folders.some((path) => /ort/.test(path))).toBe(false);
    for (const path of folders) expect(await checkModel(path)).toEqual([]);
  });
});
