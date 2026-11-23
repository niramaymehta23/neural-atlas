import { createRandom } from "../random";
import {
  BRAIN_SIZE,
  breed,
  bestProgress,
  childOf,
  drive,
  feel,
  FEELER_LENGTH,
  lapOf,
  type Generation,
  type Track,
} from "./racers";

const trackOf = (rows: string[]): Track => {
  const flat = rows.join("");
  return {
    columns: rows[0]?.length ?? 0,
    rows: rows.length,
    road: [...flat].map((mark) => mark !== "."),
    start: flat.indexOf("S"),
  };
};
/** The Survival of the fittest "Twisty" track. */
const TWISTY = trackOf([
  "..........",
  ".####.....",
  ".#..#.###.",
  ".#..###.#.",
  ".#......#.",
  ".####S###.",
  "..........",
]);
const LOOP = trackOf([
  "..........",
  ".########.",
  ".#......#.",
  ".#......#.",
  ".#......#.",
  ".####S###.",
  "..........",
]);

const okLap = (track: Track) => {
  const lap = lapOf(track);
  if (lap.status !== "ok") throw new Error(`no lap: ${lap.status}`);
  return lap;
};

describe("racers: the track", () => {
  it("numbers the road squares in order round the track", () => {
    const lap = okLap(LOOP);
    expect(lap.length).toBe(22);
    expect(lap.along[LOOP.start]).toBe(0);
    expect(lap.along[LOOP.start + 1]).toBe(1);
    expect(lap.along[LOOP.start - 1]).toBe(21);
    expect(lap.along[0]).toBe(-1);
  });

  it("finds no way round when the loop is broken or the start is off the road", () => {
    const broken = { ...LOOP, road: LOOP.road.map((road, at) => road && at !== 14) };
    expect(lapOf(broken).status).toBe("no-way-round");
    const deadEnd = { ...LOOP, road: LOOP.road.map((road, at) => road && at !== LOOP.start - 1) };
    expect(lapOf(deadEnd).status).toBe("no-way-round");
    expect(lapOf({ ...LOOP, start: 0 }).status).toBe("no-start");
  });

  it("feels how far the road goes, up to the feeler's length", () => {
    // From the middle of the start square heading right: three road squares and a half, capped.
    expect(feel(TWISTY, 5.5, 5.5, 0)).toBe(FEELER_LENGTH);
    // Heading left: the road runs to column 1, so four and a half squares, capped too.
    expect(feel(LOOP, 5.5, 5.5, Math.PI)).toBe(FEELER_LENGTH);
    // Heading down: the grass starts half a square away.
    expect(feel(LOOP, 5.5, 5.5, Math.PI / 2)).toBeCloseTo(0.5, 9);
    // Heading up from the bottom straight: the infield is half a square away.
    expect(feel(LOOP, 5.5, 5.5, -Math.PI / 2)).toBeCloseTo(0.5, 9);
  });
});

describe("racers: driving", () => {
  it("drives straight with an empty brain, and leaves the road at the first corner", () => {
    const drove = drive(TWISTY, okLap(TWISTY), new Float64Array(BRAIN_SIZE));
    expect(drove.crashed).toBe(true);
    // Three squares along: the three road squares to the right of the start.
    expect(drove.progress).toBe(3);
    expect(drove.trail[0]).toBe(5.5);
    expect(drove.trail[1]).toBe(5.5);
  });

  it("makes exact copies with no change, and brand-new brains with full change", () => {
    const parent = Float64Array.from({ length: BRAIN_SIZE }, (_, at) => at / 10);
    expect(Array.from(childOf(parent, 0, createRandom(1)))).toEqual(Array.from(parent));
    const fresh = childOf(parent, 1, createRandom(1));
    const other = childOf(new Float64Array(BRAIN_SIZE), 1, createRandom(1));
    expect(Array.from(fresh)).toEqual(Array.from(other));
  });
});

describe("racers: breeding", () => {
  it("pauses after every car and gives each generation once its cars have driven", () => {
    const items = [...breed(TWISTY, { cars: 6, change: 0.3 }, 1, 3)];
    expect(items.filter((item) => item === "car")).toHaveLength(18);
    const generations = items.filter((item): item is Generation => item !== "car");
    expect(generations.map(({ index }) => index)).toEqual([0, 1, 2]);
    expect(items.indexOf(generations[0] as Generation)).toBe(6);
    expect(generations[0]?.drives).toHaveLength(6);
  });

  it("breeds the same cars from the same seed", () => {
    expect(bestProgress(TWISTY, { cars: 12, change: 0.3 }, 5, 10)).toEqual(
      bestProgress(TWISTY, { cars: 12, change: 0.3 }, 5, 10),
    );
  });

  it("gives nothing on a track with no way round", () => {
    const broken = { ...TWISTY, road: TWISTY.road.map((road, at) => road && at !== 11) };
    expect([...breed(broken, { cars: 6, change: 0.3 }, 1, 3)]).toEqual([]);
  });

  // REQ-W6-01. Measured: seed 1 goes from 4 squares in the first generation to 107 in the last.
  it("evolution (seed 1, 50 generations of 30 cars) makes the best car go at least 60 squares further than the first generation's best", () => {
    const best = bestProgress(TWISTY, { cars: 30, change: 0.2 }, 1, 50);
    expect((best.at(-1) ?? 0) - (best[0] ?? 0)).toBeGreaterThanOrEqual(60);
  });

  it("copies with no change never improve (seed 1, 50 generations of 30 cars)", () => {
    const best = bestProgress(TWISTY, { cars: 30, change: 0 }, 1, 50);
    expect(new Set(best).size).toBe(1);
  });
});
