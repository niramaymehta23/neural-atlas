/**
 * The curriculum: the only source of lesson metadata. A built lesson adds
 * `load: () => import("#modules/<world>/<id>").then(({ definition }) => definition)` to its entry
 * (`#modules/` is `@/modules/`, except on the server: see server-lesson.ts).
 */
import type { Lesson, WorldEntry } from "@/platform/contract";
import { world1 } from "./world-1";
import { world2 } from "./world-2";
import { world3 } from "./world-3";
import { world4 } from "./world-4";
import { world5 } from "./world-5";
import { world6 } from "./world-6";

export const worlds: readonly WorldEntry[] = [world1, world2, world3, world4, world5, world6];

/** Every lesson in curriculum order. */
export const lessons: readonly Lesson[] = worlds.flatMap(({ world, lessons }) =>
  lessons.map((lesson) => ({ ...lesson, world })),
);

export function lessonById(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
