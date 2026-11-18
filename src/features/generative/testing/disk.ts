/** Tests read the real face files from disk instead of fetching them. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { faceFiles, forgetFaceFiles } from "../face-files";

const folder = join(process.cwd(), "public", "models", "faces-v1");

export function readFacesFromDisk() {
  forgetFaceFiles();
  faceFiles.read = async (file) => {
    const bytes = await readFile(join(folder, file));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  };
}

/** Makes every fetch fail, for the failure message and Try again. */
export function failFaceFiles() {
  forgetFaceFiles();
  faceFiles.read = async () => {
    throw new Error("offline");
  };
}
