/**
 * Verifies every self-hosted model folder against the SHA-256 lines in its README (the
 * `sha256sum` format: "<hash>  <file>"), so a corrupted, truncated or silently re-exported model
 * fails CI. A folder whose README lists no checksums fails too.
 * Usage: pnpm check-model [models folder]   (default: public/models)
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const LINE = /^([0-9a-f]{64}) {2}(\S+)$/;

/** The "<sha256>  <file>" lines of a README. */
export const checksums = (readme: string) =>
  readme.split("\n").flatMap((line) => {
    const [, sha, file] = LINE.exec(line.trim()) ?? [];
    return sha && file ? [{ sha, file }] : [];
  });

/** Problems with one model folder, as sentences; empty when every listed file matches. */
export async function checkModel(folder: string): Promise<string[]> {
  const readme = await readFile(join(folder, "README.md"), "utf8").catch(() => "");
  const listed = checksums(readme);
  if (listed.length === 0) return [`${folder}/README.md lists no SHA-256 checksums.`];
  const problems: string[] = [];
  for (const { sha, file } of listed) {
    const body = await readFile(join(folder, file)).catch(() => null);
    if (!body) problems.push(`${folder}/${file} is missing.`);
    else if (createHash("sha256").update(body).digest("hex") !== sha) {
      problems.push(`${folder}/${file} does not match the checksum in its README.`);
    }
  }
  return problems;
}

/** Model folders are the directories under `root` that are not a copied ONNX runtime. */
export async function modelFolders(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !/^ort($|-)/.test(entry.name))
    .map((entry) => join(root, entry.name))
    .sort();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const folders = await modelFolders(process.argv[2] ?? join("public", "models"));
  const problems = (await Promise.all(folders.map(checkModel))).flat();
  for (const problem of problems) console.error(`check-model: ${problem}`);
  if (problems.length === 0) console.log(`check-model: ${folders.join(", ")} match their READMEs.`);
  process.exitCode = problems.length > 0 ? 1 : 0;
}
