import { lessonById, lessons, worlds } from "./index";

describe("catalog", () => {
  it("holds the 74 lessons of the six worlds", () => {
    expect(lessons).toHaveLength(74);
    expect(worlds.map(({ lessons }) => lessons.length)).toEqual([10, 10, 11, 12, 17, 14]);
    expect(lessons.map(({ world }) => world)).toEqual(
      [...lessons.map(({ world }) => world)].sort(),
    );
  });

  it("gives every lesson a unique slug and plain fields", () => {
    expect(new Set(lessons.map(({ id }) => id)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      expect(lesson.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      for (const field of [lesson.title, lesson.realTerm, lesson.idea, lesson.playWith]) {
        expect(field.trim()).not.toBe("");
      }
    }
  });

  it("links prerequisites into an acyclic graph of known lessons", () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string, path: string[]): void => {
      if (done.has(id)) return;
      if (visiting.has(id)) throw new Error(`Cycle: ${[...path, id].join(" → ")}`);
      const lesson = lessonById(id);
      if (!lesson) throw new Error(`Unknown prerequisite "${id}" after ${path.at(-1)}`);
      visiting.add(id);
      for (const prerequisite of lesson.prerequisites) visit(prerequisite, [...path, id]);
      visiting.delete(id);
      done.add(id);
    };
    for (const { id, prerequisites } of lessons) {
      expect(prerequisites).not.toContain(id);
      visit(id, []);
    }
    expect(lessons.filter(({ prerequisites }) => prerequisites.length === 0)).toHaveLength(1);
  });

  it("keeps learner fields free of symbols and jargon", () => {
    for (const { id, title, idea, playWith } of lessons) {
      for (const field of [title, idea, playWith]) {
        expect({ id, field }).not.toEqual({ id, field: expect.stringContaining("=") });
        expect({ id, field }).not.toEqual({ id, field: expect.stringMatching(/neural network/i) });
      }
    }
  });

  it("lists no prerequisite that another prerequisite already leads to", () => {
    const reach = (id: string, seen = new Set<string>()): Set<string> => {
      for (const next of lessonById(id)?.prerequisites ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          reach(next, seen);
        }
      }
      return seen;
    };
    const redundant = lessons.flatMap(({ id, prerequisites }) =>
      prerequisites
        .filter((prerequisite) =>
          prerequisites.some((other) => other !== prerequisite && reach(other).has(prerequisite)),
        )
        .map((prerequisite) => `${id} → ${prerequisite}`),
    );
    expect(redundant).toEqual([]);
  });
});
