import { render } from "@testing-library/react";
import { Timeline } from "@/engine/timeline/timeline";
import { lampPosts } from "@/engine/ml/svm";
import type { TimelineFrame } from "@/platform/contract";
import { definition } from "./index";
import { missions } from "./missions";
import { roadOf, wrongSide, type RoadState } from "./model";
import { predictions } from "./predictions";
import { RoadScene } from "./scene";

const state = (change: Partial<RoadState> = {}) =>
  ({ ...definition.initialState, ...change }) as RoadState;
const [mission] = missions;
const [prediction] = predictions;

/** The state after pulling up home `index`. */
function pull(from: RoadState, index: number): RoadState {
  const pulled = from.points[index] ?? null;
  return { ...from, points: from.points.filter((_, at) => at !== index), pulled };
}

describe("the widest road", () => {
  const start = state();
  const posts = lampPosts(roadOf(start));
  const plain = start.points.findIndex((_, index) => !posts.includes(index));

  it("the default road rests on a few lamp posts", () => {
    expect(posts.length).toBeGreaterThanOrEqual(2);
    expect(posts.length).toBeLessThan(start.points.length / 4);
  });

  it("pulling a lamp post moves the road and earns the mission; any other home does not", () => {
    const [post] = posts;
    expect(mission.when(start)).toBe(false);
    expect(mission.when(pull(start, post ?? 0))).toBe(true);
    expect(mission.when(pull(start, plain))).toBe(false);
  });

  it("the guess reads whether the road moved when a plain home was pulled", () => {
    expect(prediction.answer(start)).toBeNull();
    expect(prediction.answer(pull(start, posts[0] ?? 0))).toBeNull();
    expect(prediction.answer(pull(start, plain))).toBe("no");
  });

  it("flat ground can't split a ring; lifting the middle can", () => {
    const flat = state({ garden: "own", points: plantRing() });
    expect(wrongSide(roadOf(flat), flat.points)).toBeGreaterThanOrEqual(10);
    const lifted = { ...flat, ground: "bowl" as const, lift: 0.6, strict: 0.8 };
    expect(wrongSide(roadOf(lifted), lifted.points)).toBe(0);
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = {
      garden: "sea",
      points: [],
      brush: 1.4,
      strict: 3,
      lift: -1,
      ground: "cliff",
      pulled: { x: 9 },
    };
    expect(parse(saved as never, definition.initialState)).toEqual({
      garden: "blobs",
      points: [],
      brush: 1,
      strict: 1,
      lift: 0,
      ground: "flat",
      pulled: null,
    });
  });

  it("says what holds the road up, and draws it", () => {
    expect(definition.describe?.(start, undefined)).toMatch(/^The road rests on \w+ lamp posts\./);
    render(
      <RoadScene
        state={start}
        update={vi.fn()}
        timeline={new Timeline<TimelineFrame>()}
        side="main"
      />,
    );
    expect(document.querySelectorAll("[data-post]")).toHaveLength(posts.length);
    expect(document.querySelector("[data-road=middle]")?.getAttribute("d")).toMatch(/^M/);
  });
});

function plantRing() {
  return Array.from({ length: 40 }, (_, at) => {
    const inner = at % 2 === 0;
    const angle = at * 0.7;
    const radius = inner ? 0.25 : 0.8;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), label: inner ? 0 : 1 };
  });
}
