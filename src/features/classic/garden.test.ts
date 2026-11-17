import { hasBothGroups, MAX_DOTS, newDots, parseDots, plantGarden, plantInto } from "./garden";
import { rememberLast } from "./memo";

describe("garden", () => {
  it("plants the same seeded preset every time, rounded", () => {
    const one = plantGarden("moons");
    expect(one).toEqual(plantGarden("moons"));
    expect(one.length).toBeGreaterThan(0);
    for (const dot of one) expect(dot.x * 1000).toBeCloseTo(Math.round(dot.x * 1000));
    expect(plantGarden("own")).toEqual([]);
  });

  it("new dots are a different batch from the same recipe", () => {
    const fresh = newDots("blobs");
    expect(fresh.length).toBe(200);
    expect(fresh[0]).not.toEqual(plantGarden("blobs")[0]);
    expect(newDots("own")).toEqual([]);
  });

  it("keeps only well-formed dots from a link, rounded and capped", () => {
    const saved = [
      { x: 0.12345, y: -0.5, label: 1 },
      { x: 2, y: 0, label: 0 },
      { x: 0, y: 0, label: 5 },
      { x: Number.NaN, y: 0, label: 0 },
      { x: 0, y: 0, label: 0.5 },
      "dot",
      null,
      ...Array.from({ length: MAX_DOTS + 10 }, () => ({ x: 0, y: 0, label: 0 })),
    ];
    const dots = parseDots(saved);
    expect(dots[0]).toEqual({ x: 0.123, y: -0.5, label: 1 });
    expect(dots).toHaveLength(MAX_DOTS);
    expect(parseDots("lots")).toEqual([]);
    expect(parseDots([{ x: 0, y: 0, label: 2 }], 3)).toHaveLength(1);
  });

  it("stops planting at the cap and says so", () => {
    const almost = Array.from({ length: MAX_DOTS - 1 }, () => ({ x: 0, y: 0, label: 0 }));
    const planted = plantInto(almost, [
      { x: 0.1, y: 0.1, label: 1 },
      { x: 0.2, y: 0.2, label: 1 },
    ]);
    expect(planted.dots).toHaveLength(MAX_DOTS);
    expect(planted.full).toBe(true);
  });

  it("knows when both groups are there", () => {
    expect(hasBothGroups([{ x: 0, y: 0, label: 0 }])).toBe(false);
    expect(hasBothGroups(plantGarden("xor"))).toBe(true);
  });
});

describe("rememberLast", () => {
  it("works again only when an input changes", () => {
    let runs = 0;
    const sum = rememberLast((a: number, b: number) => {
      runs += 1;
      return a + b;
    });
    expect(sum(1, 2)).toBe(3);
    expect(sum(1, 2)).toBe(3);
    expect(runs).toBe(1);
    expect(sum(1, 3)).toBe(4);
    expect(runs).toBe(2);
  });
});
