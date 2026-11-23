import type { Lesson, WorldNumber } from "@/platform/contract";
import type { Vec3 } from "@/scene3d/CameraRig";

export type Star = { lesson: Lesson; position: Vec3 };
/** Indexes into the star list: `from` is the idea that `to` builds on. */
export type Link = { from: number; to: number };

/** The six groups sit on an oval around the middle of the paper. */
const RING = { x: 3.3, z: 1.95 };
/** How far a group of average size spreads from its centre before the stars are eased apart. */
const GROUP_SPREAD = { x: 1.35, z: 0.85, size: 13 };
/** Stars hover between these heights above the paper. */
const HEIGHT = { low: 0.3, span: 0.22 };
const MIDDLE_HEIGHT = HEIGHT.low + HEIGHT.span / 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FLOAT = { height: 0.05, seconds: 7 };

/**
 * Where the camera sits to see the whole map and what it looks at. Every framing looks down at
 * this same slant, so a layout that is even from here is even in each group's close view too.
 */
export const OVERVIEW = { target: [0, 0.3, 0.15] as Vec3, from: [0, 5, 5.2] as Vec3 };
const SLANT = Math.atan2(OVERVIEW.from[1], OVERVIEW.from[2]);
const VIEW_DISTANCE = Math.hypot(OVERVIEW.from[1], OVERVIEW.from[2]);

/**
 * How far apart two stars must look from the camera, in units at the middle of the map (farther
 * stars look smaller, so they need more). Wide enough that no star’s link, 28 px across, lies on
 * another's on a laptop, and no bead on another anywhere.
 */
const APART = { within: 0.5, between: 0.7 };
/** Rounds of easing too-close stars apart; plenty for them all to settle. */
const EASE_ROUNDS = 300;

/** Middle of a world's group on the paper. */
export function worldCentre(world: WorldNumber): Vec3 {
  const angle = ((world - 1) / 6) * Math.PI * 2 - Math.PI / 2;
  return [RING.x * Math.cos(angle), 0, -RING.z * Math.sin(angle)];
}

/** The camera's distance for one group's close view, as a share of the whole map's. */
const GROUP_SHARE = 0.49;
/** The widest view shape the framings fit without stepping back; narrower views step back. */
const FITS_ASPECT = 2.0;

export const offset = ([x, y, z]: Vec3, [dx, dy, dz]: Vec3, scale = 1): Vec3 => [
  x + dx * scale,
  y + dy * scale,
  z + dz * scale,
];

/**
 * Where the camera sits for the whole map or one group. In a narrow view (a phone held upright)
 * it steps back so the sides still fit.
 */
export function mapFraming(world: WorldNumber | null, aspect: number) {
  const back = Math.max(1, FITS_ASPECT / aspect);
  const target =
    world === null ? OVERVIEW.target : offset(worldCentre(world), [0, MIDDLE_HEIGHT, 0]);
  const share = world === null ? 1 : GROUP_SHARE;
  return { position: offset(target, OVERVIEW.from, share * back), target };
}

/** A star as the camera sees it: across, and up the slanted view; `far` is how small it looks. */
type Seen = { across: number; up: number; far: number; world: number };

/** Eases stars that look too close apart, a little each round, always in the same order. */
function easeApart(seen: readonly Seen[]) {
  for (let round = 0; round < EASE_ROUNDS; round += 1) {
    let moved = false;
    for (const [at, a] of seen.entries())
      for (const b of seen.slice(at + 1)) {
        const across = b.across - a.across;
        const up = b.up - a.up;
        const apart = Math.hypot(across, up) || 1e-6;
        const room = a.world === b.world ? APART.within : APART.between;
        const wanted = (room * (a.far + b.far)) / 2;
        if (apart >= wanted) continue;
        const push = (wanted - apart) / 2 / apart;
        a.across -= across * push;
        a.up -= up * push;
        b.across += across * push;
        b.up += up * push;
        moved = true;
      }
    if (!moved) return;
  }
}

/**
 * Places every lesson: each world is a sunflower-seed spiral around its centre (first lessons in
 * the middle), eased apart as the camera sees it so no star covers another. Each star is then
 * raised off the paper along the line of sight, so its height never moves it in the view. Links
 * follow prerequisites.
 */
export function layoutConstellation(lessons: readonly Lesson[]): { stars: Star[]; links: Link[] } {
  const tilt = Math.sin(SLANT);
  const places = lessons.map((lesson) => {
    const inWorld = lessons.filter(({ world }) => world === lesson.world);
    const order = inWorld.indexOf(lesson);
    const size = Math.sqrt(inWorld.length / GROUP_SPREAD.size);
    const reach = size * Math.sqrt((order + 0.5) / inWorld.length);
    const turn = order * GOLDEN_ANGLE;
    const [cx, , cz] = worldCentre(lesson.world);
    const z = cz + GROUP_SPREAD.z * reach * Math.sin(turn);
    const [, high, back] = OVERVIEW.from;
    const far = Math.hypot(high, OVERVIEW.target[2] + back - z) / VIEW_DISTANCE;
    const across = cx + GROUP_SPREAD.x * reach * Math.cos(turn);
    const height = HEIGHT.low + HEIGHT.span * ((order * 0.618) % 1);
    return { lesson, height, seen: { across, up: z * tilt, far, world: lesson.world } };
  });
  easeApart(places.map(({ seen }) => seen));
  const stars = places.map(({ lesson, height, seen }): Star => {
    const z = seen.up / tilt + (height - MIDDLE_HEIGHT) / Math.tan(SLANT);
    return { lesson, position: [seen.across, height, z] };
  });
  const index = new Map(lessons.map(({ id }, at) => [id, at]));
  const links = lessons.flatMap(({ prerequisites }, to) =>
    prerequisites.flatMap((id) => {
      const from = index.get(id);
      return from === undefined ? [] : [{ from, to }];
    }),
  );
  return { stars, links };
}

/** Two staggered rows along the far edge of the map; the nearer one leaves room for the top group. */
const SKY = [
  { back: -4.95, across: [0, 1.2, 2.4, 3.6, 4.8] },
  { back: -3.7, across: [1.69, 2.8, 3.92, 5.04] },
] as const;

/** Where extra stars (achievements) go: a sky along the far edge, clear of every idea, its rows staggered. */
export function extraPlaces(): Vec3[] {
  return SKY.flatMap(({ back, across }) =>
    across
      .flatMap((x) => (x === 0 ? [0] : [-x, x]))
      .sort((a, b) => a - b)
      .map((x): Vec3 => [x, MIDDLE_HEIGHT, back]),
  );
}

/** How far a world's group has drifted up or down at this moment: a slow, gentle bob. */
export function floatOffset(world: WorldNumber, seconds: number): number {
  return FLOAT.height * Math.sin((seconds / FLOAT.seconds) * Math.PI * 2 + world);
}

/** Opacity of the stars and lines of the groups not picked in the filter. */
export const DIMMED = 0.2;

/**
 * Splits the lines into those inside the picked group (drawn at full strength) and the rest
 * (dimmed). With no group picked every line is chosen.
 */
export function partitionLinks(
  stars: readonly Star[],
  links: readonly Link[],
  world: WorldNumber | null,
): { chosen: Link[]; other: Link[] } {
  const inWorld = (index: number) => world === null || stars[index]?.lesson.world === world;
  const chosen: Link[] = [];
  const other: Link[] = [];
  for (const link of links) (inWorld(link.from) && inWorld(link.to) ? chosen : other).push(link);
  return { chosen, other };
}
