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
const progressOf = (lessons: Progress["lessons"]): Progress => ({ lessons, achievements: [] });

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

  it("never suggests a lesson that is still being drawn", () => {
    const unbuilt = lessons.map(({ id, prerequisites }) => ({ id, prerequisites }));
    expect(nextSuggested(unbuilt, progressOf({ a: done }))).toBeNull();
  });

  it("returns null once every built lesson is mastered, though unbuilt ones remain", () => {
    expect(nextSuggested(lessons, progressOf({ a: done, c: done, d: done }))).toBeNull();
  });

  it("takes plain data with any truthy load marker", () => {
    const plain = lessons.map(({ id, prerequisites, load }) => ({
      id,
      prerequisites,
      load: !!load,
    }));
    expect(nextSuggested(plain, progressOf({ a: done }))).toBe("c");
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

  it("salvages a bad lesson record and keeps the good ones (PLT-01)", async () => {
    const storage = memoryStorage(
      new Map([["progress-v1", { lessons: { a: done, b: { visited: 1, missions: ["x", 3] } } }]]),
    );
    const store = createProgressStore(storage);
    await store.recordVisit("c");
    const saved = storage.saved.get("progress-v1") as Progress;
    expect(saved.lessons.a).toEqual(done);
    expect(saved.lessons.b).toEqual({ visited: true, missions: ["x"], predicted: false });
    expect(saved.lessons.c?.visited).toBe(true);
  });

  it("copies unreadable progress aside before writing over it (PLT-01)", async () => {
    const storage = memoryStorage(new Map([["progress-v1", "garbage"]]));
    const store = createProgressStore(storage);
    await store.recordVisit("a");
    const aside = [...storage.saved.keys()].filter((key) => key.startsWith("progress-v1-corrupt-"));
    expect(aside).toHaveLength(1);
    expect(storage.saved.get(aside[0] ?? "")).toBe("garbage");
  });

  it("keeps saving after one change throws (PLT-27)", async () => {
    const storage = memoryStorage();
    const store = createProgressStore(storage);
    await expect(
      store.change(() => {
        throw new Error("bad change");
      }),
    ).rejects.toThrow("bad change");
    await store.recordVisit("a");
    expect((storage.saved.get("progress-v1") as Progress).lessons.a?.visited).toBe(true);
  });

  it("lets ready settle even when storage never answers (PLT-21)", async () => {
    vi.useFakeTimers();
    const store = createProgressStore({ read: () => new Promise(() => {}), write: async () => {} });
    let settled = false;
    void store.ready.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(2000);
    expect(settled).toBe(true);
    vi.useRealTimers();
  });
});
