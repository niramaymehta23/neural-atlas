// @vitest-environment node
import { nodeVision, samplePhoto } from "./testing/node-vision";
import { FEATURES, SHOWN, STAGES, topAnswers, type LoadedVision } from "./seeing";

let vision: LoadedVision;
beforeAll(async () => {
  vision = await nodeVision();
});
afterAll(() => vision.dispose());

describe("what the picture model sees", () => {
  it("names the sample photos", async () => {
    const dog = await vision.see(samplePhoto("dog"), {});
    expect(dog.answers[0]!.name).toBe("boxer");
    const teapot = await vision.see(samplePhoto("teapot"), {});
    expect(teapot.answers[0]!.name).toBe("teapot");
  });

  it("gives its patterns at three depths, each scaled to 0–1, and its last numbers", async () => {
    const seen = await vision.see(samplePhoto("cat"), { maps: true, features: true });
    expect(seen.maps?.map(({ stage, size }) => [stage, size])).toEqual(
      STAGES.map(({ stage, size }) => [stage, size]),
    );
    for (const { maps, size } of seen.maps ?? []) {
      expect(maps).toHaveLength(SHOWN * size * size);
      expect(Math.min(...maps)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...maps)).toBeLessThanOrEqual(1);
      expect(Math.max(...maps)).toBeGreaterThan(0.1);
    }
    expect(seen.features).toHaveLength(FEATURES);
  });

  it("is fooled by a smudge of one shade", async () => {
    const photo = samplePhoto("dog");
    const fooled = await vision.fool(photo, 1);
    let most = 0;
    for (let index = 0; index < photo.length; index += 1) {
      most = Math.max(most, Math.abs(photo[index]! - fooled.pixels[index]!));
    }
    expect(most).toBeLessThanOrEqual(1);
    expect(fooled.before[0]!.thing).not.toBe(fooled.after[0]!.thing);
  }, 180_000);
});

describe("best answers", () => {
  it("orders by share, ties to the lower thing", () => {
    expect(topAnswers([0.1, 0.5, 0.5, 0, 0.2, 0.3]).map(({ thing }) => thing)).toEqual([
      1, 2, 5, 4, 0,
    ]);
    expect(topAnswers([0.2, 0.8], ["cup", "cat"])[0]).toEqual({
      thing: 1,
      name: "cat",
      share: 0.8,
    });
  });
});
