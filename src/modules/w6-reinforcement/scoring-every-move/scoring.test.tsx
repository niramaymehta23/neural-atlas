import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createQRunner } from "@/engine/rl/q-learning";
import { Timeline } from "@/engine/timeline/timeline";
import { definition } from "./index";
import { missions } from "./missions";
import {
  besideTrap,
  frameFor,
  KITCHEN,
  settingsOf,
  worldOf,
  type ScoringFrame,
  type ScoringState,
} from "./model";
import { predictions } from "./predictions";
import { ScoringScene } from "./scene";

const state = (change: Partial<ScoringState> = {}) =>
  ({ ...definition.initialState, ...change }) as ScoringState;

/** Plays `tries` tries on the kitchen board and returns every frame they leave. */
function practise(learning: Partial<ScoringState>, tries: number, seed: number) {
  const runner = createQRunner(worldOf(KITCHEN), settingsOf(state(learning)), seed);
  const frames: ScoringFrame[] = [];
  while (runner.episodes < tries)
    for (const episode of runner.advance(1))
      frames.push(frameFor(episode, runner.q, KITCHEN, frames.at(-1)));
  return frames;
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe("scoring every move", () => {
  it("learning at full speed leaves the scores jumping where a slow learner's settle", () => {
    const [mission] = missions;
    for (const seed of SEEDS) {
      const fast = state({ learnRate: 1 });
      expect(practise(fast, 300, seed).some((frame) => mission.when(fast, frame))).toBe(true);
      const slow = state({ learnRate: 0.2 });
      expect(practise(slow, 300, seed).some((frame) => mission.when(slow, frame))).toBe(false);
    }
  });

  it("the default puppy learns a way to its bowl, and the guess reads that way", () => {
    const [prediction] = predictions;
    const answers = SEEDS.map((seed) => prediction.answer(state(), practise({}, 300, seed).at(-1)));
    expect(answers.filter((answer) => answer !== null).length).toBeGreaterThanOrEqual(6);
    expect(prediction.answer(state(), practise({}, 100, 1).at(-1))).toBeNull();
  });

  it("knows which squares sit beside the lava", () => {
    expect(besideTrap(KITCHEN, 21)).toBe(false);
    expect(besideTrap(KITCHEN, 22)).toBe(true);
    expect(besideTrap(KITCHEN, 26)).toBe(true);
    expect(besideTrap(KITCHEN, 27)).toBe(false);
    expect(besideTrap(KITCHEN, 14)).toBe(false);
  });

  it("paints the chosen tile where the board is tapped, never on the start square", async () => {
    const update = vi.fn();
    render(
      <ScoringScene
        state={state({ brush: "trap" })}
        update={update}
        timeline={new Timeline<ScoringFrame>()}
        side="main"
      />,
    );
    const board = screen.getByRole("application");
    board.focus();
    await userEvent.keyboard("{Enter}");
    const change = update.mock.calls.at(-1)?.[0] as (s: ScoringState) => Partial<ScoringState>;
    expect(change(state()).tiles?.[0]).toBe("trap");
    update.mockClear();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");
    expect(update).not.toHaveBeenCalled();
  });

  it("a shared link replays the tries it had made", async () => {
    const timeline = new Timeline<ScoringFrame>();
    await act(async () => {
      render(
        <ScoringScene
          state={state({ episodes: 40 })}
          update={vi.fn()}
          timeline={timeline}
          side="main"
        />,
      );
    });
    expect(timeline.frames()).toHaveLength(40);
    expect(screen.getByTestId("scoring-every-move").dataset.tries).toBe("40");
  });
});
