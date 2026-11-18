/**
 * Points World 5's file loader at the files on disk, as the site would serve them, for tests.
 * Call `readFilesFromDisk()` in a test file before anything loads.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { forgetLanguageFiles, languageFiles } from "../files";

export async function readDisk(path: string): Promise<ArrayBuffer> {
  const body = await readFile(join(process.cwd(), "public", path));
  return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
}

export function readFilesFromDisk() {
  forgetLanguageFiles();
  languageFiles.read = readDisk;
}
