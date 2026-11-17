import { lessons } from "@/catalog";
import { floatOffset, layoutConstellation, partitionLinks, worldCentre } from "./layout";

const { stars, links } = layoutConstellation(lessons);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((value, axis) => value - (b[axis] ?? 0)));

describe("layoutConstellation", () => {
  it("places all 74 ideas, each once, above the paper", () => {
    expect(stars).toHaveLength(74);
    expect(new Set(stars.map(({ lesson }) => lesson.id)).size).toBe(74);
    for (const { position } of stars) expect(position[1]).toBeGreaterThan(0);
  });

  it("keeps each world in its own group with room between ideas", () => {
    for (const { lesson, position } of stars) {
      expect(distance(position, worldCentre(lesson.world))).toBeLessThan(1.2);
    }
    for (const [at, a] of stars.entries()) {
      for (const b of stars.slice(at + 1)) {
        expect(distance(a.position, b.position)).toBeGreaterThan(0.18);
      }
    }
  });

  it("draws one line per prerequisite, from the earlier idea", () => {
    const total = lessons.reduce((sum, { prerequisites }) => sum + prerequisites.length, 0);
    expect(links).toHaveLength(total);
    for (const { from, to } of links) {
      expect(stars[to]?.lesson.prerequisites).toContain(stars[from]?.lesson.id);
    }
  });
});

describe("floatOffset", () => {
  it("bobs gently and differently per world", () => {
    for (let t = 0; t < 10; t += 0.5) expect(Math.abs(floatOffset(1, t))).toBeLessThanOrEqual(0.05);
    expect(floatOffset(1, 2)).not.toBeCloseTo(floatOffset(2, 2));
  });
});

describe("partitionLinks", () => {
  it("keeps every line at full strength when no group is picked", () => {
    const { chosen, other } = partitionLinks(stars, links, null);
    expect(chosen).toHaveLength(links.length);
    expect(other).toHaveLength(0);
  });

  it("dims every line that leaves the picked group", () => {
    const { chosen, other } = partitionLinks(stars, links, 3);
    const world = (index: number) => stars[index]?.lesson.world;
    expect(chosen.length).toBeGreaterThan(0);
    expect(other.length).toBeGreaterThan(0);
    expect(chosen.length + other.length).toBe(links.length);
    for (const { from, to } of chosen) expect([world(from), world(to)]).toEqual([3, 3]);
    for (const { from, to } of other) expect(world(from) === 3 && world(to) === 3).toBe(false);
  });
});
