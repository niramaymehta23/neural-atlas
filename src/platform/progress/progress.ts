import { useStore } from "zustand";
import type { Lesson } from "../contract";
import { browserStorage, createPersistedStore, type KeyValueStorage } from "../storage";

export type LessonProgress = { visited: boolean; missions: string[]; predicted: boolean };
export type Progress = { lessons: Record<string, LessonProgress> };

const KEY = "progress-v1";
const EMPTY: LessonProgress = { visited: false, missions: [], predicted: false };

/** Mastered = visited, at least one mission done and one prediction made. */
export function isMastered(lesson: LessonProgress | undefined): boolean {
  return Boolean(lesson?.visited && lesson.missions.length > 0 && lesson.predicted);
}

/** Every finished mission is a star. */
export function starCount(progress: Progress): number {
  return Object.values(progress.lessons).reduce((sum, { missions }) => sum + missions.length, 0);
}

/**
 * The lesson to suggest next: the first one in curriculum order that is not mastered and whose
 * prerequisites are all mastered, preferring lessons that are built. An unbuilt prerequisite
 * cannot be mastered yet, so it does not hold back the lessons after it. Null once everything is
 * mastered.
 */
export function nextSuggested(
  lessons: readonly Pick<Lesson, "id" | "prerequisites" | "load">[],
  progress: Progress,
): string | null {
  const built = new Set(lessons.filter(({ load }) => load).map(({ id }) => id));
  const mastered = (id: string) => isMastered(progress.lessons[id]);
  const met = (id: string) => mastered(id) || !built.has(id);
  const ready = lessons.filter(
    ({ id, prerequisites }) => !mastered(id) && prerequisites.every(met),
  );
  return (ready.find(({ load }) => load) ?? ready[0])?.id ?? null;
}

function parseProgress(saved: unknown): Progress | null {
  if (typeof saved !== "object" || saved === null || !("lessons" in saved)) return null;
  const { lessons } = saved;
  if (typeof lessons !== "object" || lessons === null) return null;
  const valid = Object.values(lessons).every(
    (entry: Partial<LessonProgress>) =>
      typeof entry?.visited === "boolean" &&
      typeof entry.predicted === "boolean" &&
      Array.isArray(entry.missions) &&
      entry.missions.every((mission) => typeof mission === "string"),
  );
  return valid ? (saved as Progress) : null;
}

export function createProgressStore(storage: KeyValueStorage) {
  const store = createPersistedStore<Progress>(KEY, { lessons: {} }, parseProgress, storage);
  const edit = (id: string, change: (lesson: LessonProgress) => LessonProgress) =>
    store.change(({ lessons }) => ({
      lessons: { ...lessons, [id]: change(lessons[id] ?? EMPTY) },
    }));
  return {
    ...store,
    recordVisit: (id: string) => edit(id, (lesson) => ({ ...lesson, visited: true })),
    recordMission: (id: string, mission: string) =>
      edit(id, (lesson) =>
        lesson.missions.includes(mission)
          ? lesson
          : { ...lesson, missions: [...lesson.missions, mission] },
      ),
    recordPrediction: (id: string) => edit(id, (lesson) => ({ ...lesson, predicted: true })),
  };
}

/** The learner's progress, kept in IndexedDB. */
export const progressStore = createProgressStore(browserStorage);

export function useProgress<T>(select: (progress: Progress) => T): T {
  return useStore(progressStore, select);
}
