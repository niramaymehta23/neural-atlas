import { lessons } from "@/catalog";
import { PerspectiveCamera, Vector3 } from "three";
import type { WorldNumber } from "@/platform/contract";
import { FIELD_OF_VIEW } from "@/scene3d/CameraRig";
import {
  extraPlaces,
  floatOffset,
  layoutConstellation,
  mapFraming,
  partitionLinks,
  worldCentre,
} from "./layout";
import { BEAD_GROW, RADIUS } from "./bead";

const { stars, links } = layoutConstellation(lessons);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((value, axis) => value - (b[axis] ?? 0)));

describe("layoutConstellation", () => {
  it("places all 74 ideas, each once, above the paper", () => {
    expect(stars).toHaveLength(74);
    expect(new Set(stars.map(({ lesson }) => lesson.id)).size).toBe(74);
    for (const { position } of stars) expect(position[1]).toBeGreaterThan(0);
  });

  it("keeps each world in its own group", () => {
    for (const { lesson, position } of stars) {
      expect(distance(position, worldCentre(lesson.world))).toBeLessThan(1.7);
      const nearest = WORLDS.reduce((best, world) =>
        distance(position, worldCentre(world)) < distance(position, worldCentre(best))
          ? world
          : best,
      );
      expect(nearest).toBe(lesson.world);
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

const WORLDS: readonly WorldNumber[] = [1, 2, 3, 4, 5, 6];

/** An extra star's side, in px (`size-3.5`, `md:size-5`). */
const mark = (width: number) => (width < 768 ? 14 : 20);

/** Where each star's middle lands in a `width` × `height` view, and how big its bead looks there. */
function seenIn(world: WorldNumber | null, width: number, height: number) {
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, width / height, 0.1, 1000);
  const { position, target } = mapFraming(world, width / height);
  camera.position.set(...position);
  camera.lookAt(new Vector3(...target));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const focal = height / 2 / Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
  // The stars earned elsewhere sit along the far edge of the whole map.
  const extras = extraPlaces().map((at, index) => ({ id: `extra ${index}`, at, extra: true }));
  return [
    ...stars
      .filter(({ lesson }) => world === null || lesson.world === world)
      .map(({ lesson, position }) => ({ id: lesson.id, at: position, extra: false })),
    ...(world === null ? extras : []),
  ].map(({ id, at, extra }) => {
    const place = new Vector3(...at);
    // An extra star is drawn at a fixed size.
    const bead = extra ? mark(width) / 2 : (focal * RADIUS) / place.distanceTo(camera.position);
    // Swollen under the pointer, and at rest (a learned one is slightly bigger).
    const most = extra ? bead : bead * BEAD_GROW;
    const rest = extra ? bead : bead * 1.15;
    const onScreen = place.project(camera);
    return {
      id,
      x: ((onScreen.x + 1) * width) / 2,
      y: ((1 - onScreen.y) * height) / 2,
      bead,
      most,
      rest,
    };
  });
}

/** The map's box on a phone, a short laptop, a laptop and a large screen (the header above it). */
const VIEWS = [
  { width: 375, height: 320 },
  { width: 844, height: 390 },
  { width: 1280, height: 424 },
  { width: 1366, height: 508 },
  { width: 1920, height: 800 },
];
/** A star link's side, in px (`size-7`). */
const LINK = 28;

type Spot = { most: number; rest: number };

/** Every pair closer than `apart` says, with how close they come. */
function tooClose(seen: ReturnType<typeof seenIn>, apart: (a: Spot, b: Spot) => number) {
  return seen.flatMap((a, at) =>
    seen.slice(at + 1).flatMap((b) => {
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      return gap < apart(a, b) ? [`${a.id} / ${b.id}: ${gap.toFixed(1)}`] : [];
    }),
  );
}

describe("the map as it is seen", () => {
  it.each(VIEWS)(
    "no bead covers another at $width × $height, even swollen",
    ({ width, height }) => {
      for (const world of [null, ...WORLDS])
        expect(
          tooClose(seenIn(world, width, height), (a, b) =>
            Math.max(a.most + b.rest, a.rest + b.most),
          ),
          `world ${world ?? "all"}`,
        ).toEqual([]);
    },
  );

  it.each(VIEWS.filter(({ width }) => width >= 1280))(
    "no star's link lies on another's at $width × $height",
    ({ width, height }) => {
      expect(tooClose(seenIn(null, width, height), () => LINK)).toEqual([]);
    },
  );

  it.each(VIEWS)("no star's link lies on another's in a group at $width × $height", (view) => {
    for (const world of WORLDS)
      expect(
        tooClose(seenIn(world, view.width, view.height), () => LINK),
        `${world}`,
      ).toEqual([]);
  });

  it.each(VIEWS)("an earned star is wide enough to tap at $width × $height", (view) => {
    // Their links are 24 px across (`size-6`) or more, and round.
    const earned = seenIn(null, view.width, view.height).filter(({ id }) => id.startsWith("extra"));
    expect(tooClose(earned, () => 24)).toEqual([]);
  });

  it.each(VIEWS)("every star is inside the view at $width × $height", ({ width, height }) => {
    for (const world of [null, ...WORLDS])
      for (const { id, x, y, bead } of seenIn(world, width, height)) {
        // Room for the bob and the lean away from the pointer too (an extra star only leans).
        const room = id.startsWith("extra") ? bead * 1.4 : bead * 2.2;
        expect([x > room, x < width - room, y > room, y < height - room, id]).toEqual([
          true,
          true,
          true,
          true,
          id,
        ]);
      }
  });
});

describe("extraPlaces", () => {
  it("has room for every achievement", () => {
    expect(extraPlaces()).toHaveLength(17);
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
