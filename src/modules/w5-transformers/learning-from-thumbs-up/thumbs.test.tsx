import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  frameOf,
  honestPick,
  judgePick,
  MOST_PICKS,
  type ThumbsFrame,
  type ThumbsState,
} from "./model";
import { predictions } from "./predictions";

const base = definition.initialState as ThumbsState;

const shown = (picks: number[]): ThumbsFrame => ({ ...frameOf({ ...base, picks }), epoch: 1 });
const judged = (count: number) => Array.from({ length: count }, (_, at) => judgePick(at));
const honest = (count: number) => Array.from({ length: count }, (_, at) => honestPick(at));
const [mission] = missions;
const [guess] = predictions;

describe("learning from thumbs-up: the reward model", () => {
  it("answers honestly before any picks", () => {
    expect(shown([]).yesMan).toBe(false);
  });

  it("learns to like being right from honest picks", () => {
    const frame = shown(honest(MOST_PICKS));
    expect(frame.weights.correct).toBeGreaterThan(1);
    expect(frame.yesMan).toBe(false);
  });

  it("becomes a yes-man within ten compliment-loving picks", () => {
    const frame = shown(judged(10));
    expect(frame.weights.flatters).toBeGreaterThan(frame.weights.correct);
    expect(frame.yesMan).toBe(true);
  });

  it("holds on to being right longer when it cares more and learns less from each pick", () => {
    const judgedTen = judged(10);
    expect(frameOf({ ...base, care: 1, teach: 0.1, picks: judgedTen }).yesMan).toBe(false);
    // Caring at the start only delays it: ten praise picks at the usual size still win.
    expect(frameOf({ ...base, care: 2, picks: judgedTen }).yesMan).toBe(true);
    expect(frameOf({ ...base, care: 2, picks: judgedTen }).weights.correct).toBeGreaterThan(
      frameOf({ ...base, picks: judgedTen }).weights.correct,
    );
  });
});

describe("learning from thumbs-up: mission and guess", () => {
  it("fires for a yes-man on screen", () => {
    expect(mission.when({ ...base, picks: judged(10) }, shown(judged(10)))).toBe(true);
    expect(mission.when({ ...base, picks: honest(10) }, shown(honest(10)))).toBe(false);
    expect(mission.when({ ...base, picks: judged(9) }, shown(judged(10)))).toBe(false);
  });

  it("answers once ten picks all rewarded praise", () => {
    expect(guess.answer(base, shown(judged(9)))).toBeNull();
    expect(guess.answer(base, shown(judged(10)))).toBe("please");
    expect(guess.answer(base, shown(honest(10)))).toBeNull();
  });
});

describe("learning from thumbs-up: links", () => {
  it("keeps only real picks", () => {
    const safe = definition.parseState!(
      {
        picks: [0, 1, 2, "x", 1, ...Array(99).fill(0)],
        teach: 9,
        care: -3,
      } as unknown as ThumbsState,
      base,
    );
    expect((safe as ThumbsState).picks.length).toBe(MOST_PICKS);
    expect((safe as ThumbsState).picks.slice(0, 3)).toEqual([0, 1, 1]);
    expect((safe as ThumbsState).teach).toBe(1.5);
    expect((safe as ThumbsState).care).toBe(0);
  });
});

describe("learning from thumbs-up: in the lesson", () => {
  it("earns the star when the compliment lover judges", async () => {
    render(
      <ModuleShell
        lesson={{ ...valleyLesson, id: "learning-from-thumbs-up-1" }}
        module={definition}
      />,
    );
    await userEvent.click(document.querySelector("[data-choice='0']") as HTMLElement);
    await userEvent.click(screen.getByRole("button", { name: words.undo }));
    await userEvent.click(screen.getByRole("button", { name: words.judge }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});
