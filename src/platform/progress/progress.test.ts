import type { Lesson } from "../contract";
import { memoryStorage } from "../storage.mock";
import {
  createProgressStore,
  isMastered,
  nextSuggested,
  starCount,
  type LessonProgress,
  type Progress,
} from "./progress";

const done: LessonProgress = { visited: true, missions: ["m"], predicted: true };
const load = async () => ({}) as never;
// b is not built yet.
const lessons: Pick<Lesson, "id" | "prerequisites" | "load">[] = [
  { id: "a", prerequisites: [], load },
  { id: "b", prerequisites: ["a"] },
  { id: "c", prerequisites: ["a"], load },
  { id: "d", prerequisites: ["b", "c"], load },
];
const progressOf = (lessons: Progress["lessons"]): Progress => ({ lessons });

describe("mastery", () => {
  it("needs a visit, a mission and a prediction", () => {
    expect(isMastered(done)).toBe(true);
    expect(isMastered(undefined)).toBe(false);
    expect(isMastered({ ...done, visited: false })).toBe(false);
    expect(isMastered({ ...done, missions: [] })).toBe(false);
    expect(isMastered({ ...done, predicted: false })).toBe(false);
  });

  it("counts a star per finished mission", () => {
    expect(starCount(progressOf({ a: done, b: { ...done, missions: ["x", "y"] } }))).toBe(3);
  });
});

describe("nextSuggested", () => {
  it("starts at the first lesson", () => {
    expect(nextSuggested(lessons, progressOf({}))).toBe("a");
  });

  it("skips a visited but unmastered lesson's dependants and keeps it suggested", () => {
    expect(nextSuggested(lessons, progressOf({ a: { ...done, predicted: false } }))).toBe("a");
  });

  it("prefers a built lesson among those ready", () => {
    expect(nextSuggested(lessons, progressOf({ a: done }))).toBe("c");
  });

  it("does not let an unbuilt prerequisite block a built lesson", () => {
    // d needs b (unbuilt, so it cannot be mastered yet) and c.
    expect(nextSuggested(lessons, progressOf({ a: done, c: done }))).toBe("d");
  });

  it("falls back to curriculum order when nothing ready is built", () => {
    const unbuilt = lessons.map(({ id, prerequisites }) => ({ id, prerequisites }));
    expect(nextSuggested(unbuilt, progressOf({ a: done }))).toBe("b");
  });

  it("waits for every built prerequisite", () => {
    const built = lessons.map((lesson) => ({ ...lesson, load }));
    expect(nextSuggested(built, progressOf({ a: done, b: done }))).toBe("c");
    expect(nextSuggested(built, progressOf({ a: done, b: done, c: done }))).toBe("d");
  });

  it("returns null once everything is mastered", () => {
    expect(nextSuggested(lessons, progressOf({ a: done, b: done, c: done, d: done }))).toBeNull();
  });
});

describe("progress store", () => {
  it("survives a reload", async () => {
    const storage = memoryStorage();
    const first = createProgressStore(storage);
    await first.recordVisit("a");
    await first.recordMission("a", "m");
    await first.recordMission("a", "m");
    await first.recordPrediction("a");

    const reloaded = createProgressStore(storage);
    await reloaded.ready;
    expect(reloaded.getState().lessons.a).toEqual(done);
  });

  it("keeps a change made before the saved progress was read", async () => {
    const storage = memoryStorage(new Map([["progress-v1", progressOf({ a: done })]]));
    const store = createProgressStore(storage);
    await store.recordVisit("b");
    expect(Object.keys(store.getState().lessons)).toEqual(["a", "b"]);
  });

  it("keeps another tab's progress when saving", async () => {
    const storage = memoryStorage();
    const tabOne = createProgressStore(storage);
    const tabTwo = createProgressStore(storage);
    await Promise.all([tabOne.ready, tabTwo.ready]);
    await tabOne.recordMission("a", "m");
    await tabTwo.recordVisit("b");
    expect(Object.keys(createProgressStore(storage).getState().lessons)).toEqual([]);
    const reloaded = createProgressStore(storage);
    await reloaded.ready;
    expect(reloaded.getState().lessons.a?.missions).toEqual(["m"]);
    expect(reloaded.getState().lessons.b?.visited).toBe(true);
  });

  it("ignores saved data it does not recognise", async () => {
    const storage = memoryStorage(new Map([["progress-v1", { lessons: { a: { visited: 1 } } }]]));
    const store = createProgressStore(storage);
    await store.ready;
    expect(store.getState()).toEqual({ lessons: {} });
  });
});
