import { paintField, SURENESS_STEPS } from "./paint-field";

/** A table that ramps one channel from 0 (unsure) to 252 (sure). */
const ramp = (channel: number) =>
  Uint8ClampedArray.from({ length: SURENESS_STEPS * 3 }, (_, i) =>
    i % 3 === channel ? Math.floor(i / 3) * 4 : 0,
  );
const TABLES = [ramp(0), ramp(1), ramp(2)];

describe("paintField", () => {
  it("colours each cell by the preferred group, deeper when surer", () => {
    const pixels = new Uint8ClampedArray(3 * 4);
    paintField(pixels, Float32Array.of(0.5, 1, 0), 2, TABLES);
    expect([...pixels]).toEqual([0, 0, 0, 255, 0, 252, 0, 255, 252, 0, 0, 255]);
  });

  it("reads shares for three groups", () => {
    const pixels = new Uint8ClampedArray(4);
    paintField(pixels, Float32Array.of(0.1, 0.1, 0.8), 3, TABLES);
    expect(pixels[2]).toBeGreaterThan(150);
    expect(pixels[0]).toBe(0);
  });

  it("paints a 128 × 128 field well inside one frame", () => {
    const pixels = new Uint8ClampedArray(128 * 128 * 4);
    const outputs = Float32Array.from({ length: 128 * 128 * 3 }, (_, i) => (i * 0.37) % 1);
    paintField(pixels, outputs, 3, TABLES); // warm up
    // The fastest of several: one sample also times whatever else the machine was doing.
    const times = Array.from({ length: 20 }, () => {
      const start = performance.now();
      paintField(pixels, outputs, 3, TABLES);
      return performance.now() - start;
    });
    expect(Math.min(...times)).toBeLessThan(16);
  });
});
