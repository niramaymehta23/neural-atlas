// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clearFog,
  faceAt,
  gap,
  nearestGap,
  pictureAt,
  readWeights,
  rebuild,
  squeeze,
  type FacesManifest,
  type FogMoment,
  MUSH,
  sharpness,
} from "./faces";

const folder = join(process.cwd(), "public", "models", "faces-v1");
const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8")) as FacesManifest;
const faces = new Uint8Array(readFileSync(join(folder, "faces.bin")));
const load = (name: keyof FacesManifest["models"]) => {
  const bytes = readFileSync(join(folder, manifest.models[name].file));
  return readWeights(
    manifest.models[name],
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
  );
};
const lastOf = (moments: Iterable<FogMoment>) => [...moments].at(-1)!;

describe("the squeeze", () => {
  const weights = load("squeeze");
  const face = faceAt(faces, 0);
  const code = squeeze(weights, face);

  it("rebuilds a face closely from all sixteen numbers, and only roughly from one", () => {
    const full = gap(rebuild(weights, code, 16), face);
    const one = gap(rebuild(weights, code, 1), face);
    expect(full).toBeLessThan(0.01);
    expect(one).toBeGreaterThan(full * 3);
  });

  it("gets better with every number kept, on average over many faces", () => {
    const keeps = [1, 2, 4, 8, 16];
    const mean = keeps.map((keep) => {
      let total = 0;
      for (let index = 0; index < 40; index += 1) {
        const picture = faceAt(faces, index);
        total += gap(rebuild(weights, squeeze(weights, picture), keep), picture);
      }
      return total / 40;
    });
    for (let index = 1; index < mean.length; index += 1) {
      expect(mean[index]!).toBeLessThan(mean[index - 1]!);
    }
  });
});

describe("the maps of faces", () => {
  it("draws a face at a real face's spot on every map", () => {
    for (const name of ["map-0", "map-1", "map-2"] as const) {
      const [x, y] = manifest.models[name].spots[0]!;
      expect(nearestGap(pictureAt(load(name), x, y), faces)).toBeLessThan(0.03);
    }
  });
});

describe("clearing the fog", () => {
  const weights = load("fog");
  const fog = manifest.models.fog;

  it("clears fog into crisp, face-like pictures with enough steps", () => {
    for (const seed of [1, 2, 3]) {
      const end = lastOf(clearFog(weights, fog, seed, 20)).picture;
      expect(sharpness(end)).toBeGreaterThan(0.07);
      expect(nearestGap(end, faces, 300)).toBeLessThan(0.03);
    }
  });

  it("gives grey mush in one step", () => {
    for (const seed of [1, 2, 3]) {
      expect(sharpness(lastOf(clearFog(weights, fog, seed, 1)).picture)).toBeLessThan(MUSH);
    }
    for (let index = 0; index < 200; index += 1) {
      expect(sharpness(faceAt(faces, index))).toBeGreaterThan(MUSH);
    }
  });

  it("starts in full fog, yields one moment per step and repeats exactly", () => {
    const moments = [...clearFog(weights, fog, 4, 6)];
    expect(moments).toHaveLength(7);
    expect(moments[0]!.fog).toBe(1);
    expect(moments.at(-1)!.fog).toBe(0);
    expect(lastOf(clearFog(weights, fog, 4, 6)).picture).toEqual(moments.at(-1)!.picture);
  });

  it("keeps painted pixels as painted", () => {
    const steer = new Map<number, 0 | 1>([
      [5 * 32 + 5, 1],
      [6 * 32 + 6, 0],
    ]);
    const end = lastOf(clearFog(weights, fog, 2, 10, steer)).picture;
    expect(end[5 * 32 + 5]).toBe(1);
    expect(end[6 * 32 + 6]).toBe(0);
  });
});
