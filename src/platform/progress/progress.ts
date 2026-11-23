import { useStore } from "zustand";
import type { Lesson } from "../contract";
import { browserStorage, createPersistedStore, type KeyValueStorage } from "../storage";

export type LessonProgress = { visited: boolean; missions: string[]; predicted: boolean };
export type Progress = {
  lessons: Record<string, LessonProgress>;
  /** Achievements earned away from the lessons, by id. */
  achievements: string[];
};

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
 * The lesson to suggest next: the first built one in curriculum order that is not mastered and
 * whose prerequisites are all mastered. An unbuilt prerequisite cannot be mastered yet, so it
 * does not hold back the lessons after it. Null once every built lesson is mastered (an unbuilt
 * one would only open a "still being drawn" page). `load` marks a built lesson; any truthy value
 * will do, so plain data from the server works too.
 */
export function nextSuggested(
  lessons: readonly (Pick<Lesson, "id" | "prerequisites"> & { load?: unknown })[],
  progress: Progress,
): string | null {
  const built = new Set(lessons.filter(({ load }) => load).map(({ id }) => id));
  const mastered = (id: string) => isMastered(progress.lessons[id]);
  const met = (id: string) => mastered(id) || !built.has(id);
  return (
    lessons.find(
      ({ id, prerequisites }) => built.has(id) && !mastered(id) && prerequisites.every(met),
    )?.id ?? null
  );
}

/** The strings in a saved list, each once. */
const strings = (list: unknown): string[] =>
  Array.isArray(list)
    ? [...new Set(list.filter((item): item is string => typeof item === "string"))]
    : [];

/** One lesson's record, coerced field by field so one bad value never loses the rest. */
function salvageLesson(entry: unknown): LessonProgress {
  const { visited, missions, predicted } = (
    typeof entry === "object" && entry !== null ? entry : {}
  ) as Partial<Record<keyof LessonProgress, unknown>>;
  return {
    visited: Boolean(visited),
    missions: Array.isArray(missions)
      ? missions.filter((mission): mission is string => typeof mission === "string")
      : [],
    predicted: Boolean(predicted),
  };
}

/** Keeps every lesson it can; null only when the saved value is not progress at all. */
function parseProgress(saved: unknown): Progress | null {
  if (typeof saved !== "object" || saved === null || !("lessons" in saved)) return null;
  const { lessons } = saved;
  if (typeof lessons !== "object" || lessons === null || Array.isArray(lessons)) return null;
  return {
    lessons: Object.fromEntries(
      Object.entries(lessons).map(([id, entry]) => [id, salvageLesson(entry)]),
    ),
    // Records from before there were achievements simply have none.
    achievements: "achievements" in saved ? strings(saved.achievements) : [],
  };
}

export function createProgressStore(storage: KeyValueStorage) {
  const store = createPersistedStore<Progress>(
    KEY,
    { lessons: {}, achievements: [] },
    parseProgress,
    storage,
  );
  const edit = (id: string, change: (lesson: LessonProgress) => LessonProgress) =>
    store.change(({ lessons, achievements }) => ({
      achievements,
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
    /** An achievement, once. */
    recordAchievement: (id: string) =>
      store.change((progress) =>
        progress.achievements.includes(id)
          ? progress
          : { ...progress, achievements: [...progress.achievements, id] },
      ),
    recordPrediction: (id: string) => edit(id, (lesson) => ({ ...lesson, predicted: true })),
  };
}

/** The learner's progress, kept in IndexedDB. */
export const progressStore = createProgressStore(browserStorage);

export function useProgress<T>(select: (progress: Progress) => T): T {
  return useStore(progressStore, select);
}
