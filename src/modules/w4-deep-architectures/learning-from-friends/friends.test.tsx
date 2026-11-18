import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  allSame,
  passMessages,
  rightGuesses,
  ROUNDS,
  spreadOf,
  startingViews,
  UNBADGED,
  viewsAfter,
  type FriendsState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as FriendsState;
const at = (change: Partial<FriendsState>): FriendsState => ({ ...initial, ...change });

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `learning-from-friends-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("learning from friends: passing messages", () => {
  it("starts with only the badges sure, and mixes friends' views each round", () => {
    const start = startingViews();
    expect(start.filter((view) => view !== 0)).toHaveLength(16 - UNBADGED);
    const once = passMessages(start, 1);
    expect(once).not.toEqual(start);
    expect(passMessages(start, 0)).toEqual(start);
  });

  it("spreads each club through its own group in a few rounds", () => {
    // Measured: three rounds at the default listening put 12 of 12 in their own club.
    expect(rightGuesses(viewsAfter(0.5, 3))).toBeGreaterThanOrEqual(UNBADGED - 1);
    expect(rightGuesses(viewsAfter(0.5, 0))).toBe(0);
  });

  it("blends everyone into one view after many rounds, but not with no listening", () => {
    // Measured spreads at the default listening: 0.585 after 3 rounds, 0.021 after 40.
    expect(allSame(viewsAfter(0.5, ROUNDS.max))).toBe(true);
    expect(allSame(viewsAfter(0.5, 3))).toBe(false);
    expect(spreadOf(viewsAfter(0, ROUNDS.max))).toBe(2);
  });
});

describe("learning from friends: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires once everyone is identical", () => {
    expect(mission.when(at({ rounds: ROUNDS.max }))).toBe(true);
    expect(mission.when(at({ rounds: 10 }))).toBe(false);
    expect(mission.when(at({ rounds: 0 }))).toBe(false);
  });

  it("answers from the third round only", () => {
    expect(guess.answer(at({ rounds: 3 }))).toBe("most");
    expect(guess.answer(at({ rounds: 3, listen: 0 }))).toBe("few");
    expect(guess.answer(at({ rounds: 4 }))).toBeNull();
  });
});

describe("learning from friends: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { listen: 3, rounds: 900.4 } as unknown as FriendsState,
      initial,
    ) as FriendsState;
    expect(safe).toEqual({ listen: 1, rounds: 40 });
  });

  it("describes the network before and after passing messages", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.start);
    expect(definition.describe?.(at({ rounds: 3 }), undefined)).toMatch(/12 of the 12/);
    expect(definition.describe?.(at({ rounds: ROUNDS.max }), undefined)).toMatch(
      /exactly the same/,
    );
  });
});

describe("learning from friends: in the lesson", () => {
  it("sends pulses along friendships each round, and none with reduced motion", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.pass }));
    expect(document.querySelectorAll("[data-pulse]").length).toBeGreaterThan(0);
    expect(document.querySelector("[data-right]")).toHaveTextContent(
      /friends without a badge think/,
    );
  });

  it("shows no pulses with reduced motion", async () => {
    mockReducedMotion(true);
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.pass }));
    expect(document.querySelectorAll("[data-pulse]")).toHaveLength(0);
  });

  it("earns the star once everyone thinks the same", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.rounds.label }).focus();
    await userEvent.keyboard("{End}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    expect(document.querySelector("[data-same]")).not.toBeNull();
  });
});
