import type { Lesson, LessonModule } from "./contract";

const loaded = new Map<string, LessonModule>();

/**
 * Loads a built lesson's code and remembers it, so a lesson fetched early (the home map starts
 * when a star is pointed at) opens without a loading line.
 */
export async function fetchLesson(lesson: Pick<Lesson, "id" | "load">): Promise<LessonModule> {
  if (!lesson.load) throw new Error(`${lesson.id} is not built`);
  const definition = await lesson.load();
  loaded.set(lesson.id, definition);
  return definition;
}

/** The lesson's code if it has already arrived. */
export function fetchedLesson(id: string): LessonModule | undefined {
  return loaded.get(id);
}
