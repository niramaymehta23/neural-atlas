import type { Lesson, WorldNumber } from "@/platform/contract";
import type { Vec3 } from "@/scene3d/CameraRig";

export type Star = { lesson: Lesson; position: Vec3 };
/** Indexes into the star list: `from` is the idea that `to` builds on. */
export type Link = { from: number; to: number };

/** The six groups sit on an oval around the middle of the paper. */
const RING = { x: 2.7, z: 1.75 };
/** How far a group spreads from its centre. */
const GROUP_RADIUS = 0.85;
/** Stars hover between these heights above the paper. */
const HEIGHT = { low: 0.3, span: 0.22 };
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FLOAT = { height: 0.05, seconds: 7 };

/** Middle of a world's group on the paper. */
export function worldCentre(world: WorldNumber): Vec3 {
  const angle = ((world - 1) / 6) * Math.PI * 2 - Math.PI / 2;
  return [RING.x * Math.cos(angle), 0, -RING.z * Math.sin(angle)];
}

/**
 * Places every lesson: each world is a sunflower-seed spiral around its centre (evenly spread,
 * first lessons in the middle), raised a little off the paper. Links follow prerequisites.
 */
export function layoutConstellation(lessons: readonly Lesson[]): { stars: Star[]; links: Link[] } {
  const stars = lessons.map((lesson) => {
    const inWorld = lessons.filter(({ world }) => world === lesson.world);
    const order = inWorld.indexOf(lesson);
    const reach = GROUP_RADIUS * Math.sqrt((order + 0.5) / inWorld.length);
    const turn = order * GOLDEN_ANGLE;
    const [cx, , cz] = worldCentre(lesson.world);
    const lift = HEIGHT.low + HEIGHT.span * ((order * 0.618) % 1);
    const position: Vec3 = [cx + reach * Math.cos(turn), lift, cz + reach * Math.sin(turn)];
    return { lesson, position };
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
