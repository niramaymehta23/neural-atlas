/**
 * Fetches the World 4 face models (public/models/faces-v1) once per page and keeps them: the
 * manifest and the real faces, then each model when a lesson first asks for it. A failed fetch is
 * forgotten, so Try again fetches afresh.
 */
import {
  FACES_PATH,
  readWeights,
  type FacesManifest,
  type ModelName,
  type Weights,
} from "@/engine/generative/faces";

export type FacesKit = { manifest: FacesManifest; faces: Uint8Array };

/** Where the files come from; tests point `read` at the files on disk. */
export const faceFiles = {
  read: async (file: string): Promise<ArrayBuffer> => {
    const response = await fetch(FACES_PATH + file);
    if (!response.ok) throw new Error(`${file} answered ${response.status}.`);
    return response.arrayBuffer();
  },
};

let kit: Promise<FacesKit> | null = null;
const models = new Map<ModelName, Promise<Weights>>();

/** Keeps a promise until it fails, so a failure is never remembered. */
function remember<T>(promise: Promise<T>, forget: () => void): Promise<T> {
  promise.catch(forget);
  return promise;
}

export function loadKit(): Promise<FacesKit> {
  kit ??= remember(
    (async () => {
      const [manifestBytes, faceBytes] = await Promise.all([
        faceFiles.read("manifest.json"),
        faceFiles.read("faces.bin"),
      ]);
      const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as FacesManifest;
      return { manifest, faces: new Uint8Array(faceBytes) };
    })(),
    () => {
      kit = null;
    },
  );
  return kit;
}

export function loadModel(name: ModelName): Promise<Weights> {
  const known = models.get(name);
  if (known) return known;
  const loading = remember(
    loadKit().then(async ({ manifest }) => {
      const entry = manifest.models[name];
      return readWeights(entry, await faceFiles.read(entry.file));
    }),
    () => models.delete(name),
  );
  models.set(name, loading);
  return loading;
}

/** Forgets everything fetched (tests only). */
export function forgetFaceFiles() {
  kit = null;
  models.clear();
}
