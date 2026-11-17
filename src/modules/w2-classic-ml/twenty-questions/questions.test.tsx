import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "@/engine/timeline/timeline";
import { plantGarden } from "@/features/classic/garden";
import type { TimelineFrame } from "@/platform/contract";
import { definition } from "./index";
import { missions } from "./missions";
import { freshByDepth, longRowOutcome, scores, type QuestionsState } from "./model";
import { predictions } from "./predictions";
import { QuestionsScene } from "./scene";

const state = (change: Partial<QuestionsState> = {}) =>
  ({ ...definition.initialState, ...change }) as QuestionsState;
const [mission] = missions;
const [prediction] = predictions;

describe("twenty questions", () => {
  it("remembers every nest only with many questions and tiny boxes", () => {
    expect(mission.when(state())).toBe(false);
    const cram = state({ depth: 10, smallest: 1 });
    expect(scores(cram).own).toBe(1);
    expect(mission.when(cram)).toBe(true);
    expect(mission.when(state({ depth: 10, smallest: 8 }))).toBe(false);
    // A tidy own park with two clean patches is learned right without cramming.
    const tidy = state({
      garden: "own",
      points: [
        ...Array.from({ length: 20 }, (_, at) => ({ x: -0.5, y: at / 25 - 0.4, label: 0 })),
        ...Array.from({ length: 20 }, (_, at) => ({ x: 0.5, y: at / 25 - 0.4, label: 1 })),
      ],
      depth: 10,
    });
    expect(mission.when(tidy)).toBe(false);
  });

  it("cramming does worse on new nests than a few good questions", () => {
    const { fresh: crammed } = scores(state({ depth: 10, smallest: 1 }));
    const { fresh: few } = scores(state({ depth: 3 }));
    expect(crammed).not.toBeNull();
    expect(few ?? 0).toBeGreaterThan(crammed ?? 1);
  });

  it("the guess waits for a long row of questions, then reads the real outcome", () => {
    expect(prediction.answer(state())).toBeNull();
    const long = state({ depth: 10 });
    const curve = freshByDepth(long.points, long.garden, long.depth, long.smallest);
    expect(Math.max(...curve)).toBeGreaterThan(curve.at(-1) ?? 1);
    expect(prediction.answer(long)).toBe("worse");
    expect(longRowOutcome(state({ garden: "own", depth: 10 }))).toBeNull();
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = { garden: "lava", points: "nope", brush: -4, depth: 99, smallest: 0.2 };
    expect(parse(saved as never, definition.initialState)).toEqual({
      garden: "moons",
      points: [],
      brush: 0,
      depth: 10,
      smallest: 1,
    });
  });

  it("says what it asked and how it does", () => {
    expect(definition.describe?.(state(), undefined)).toMatch(
      /^It asked \w+ questions and cut the park into \w+ boxes\. It gets \d+ out of 100 of the nests it learned from right, and \d+ out of 100 of new nests\.$/,
    );
    expect(definition.describe?.(state({ points: [] }), undefined)).toBe("The park is empty.");
  });

  it("draws a line per question, and a tap adds a nest", async () => {
    const update = vi.fn();
    render(
      <QuestionsScene
        state={state()}
        update={update}
        timeline={new Timeline<TimelineFrame>()}
        side="main"
      />,
    );
    expect(document.querySelectorAll("[data-cut]").length).toBe(scores(state()).asked);
    screen.getByRole("application").focus();
    await userEvent.keyboard("{Enter}");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const change = update.mock.calls.at(-1)?.[0] as (s: QuestionsState) => Partial<QuestionsState>;
    expect(change(state()).points).toHaveLength(plantGarden("moons").length + 1);
  });
});
