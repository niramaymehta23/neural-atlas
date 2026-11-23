import { Blob as NodeBlob } from "node:buffer";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createLabRun, type LabMoment } from "@/engine/lab/lab-run";
import { practiseLabInProcess } from "@/engine/lab/testing/in-process-lab";
import { MEND_GOAL, THREADS } from "@/engine/lab/mend-run";
import { progressStore } from "@/platform/progress/progress";
import { encodeSnapshot, hashFor } from "@/platform/snapshot/snapshot";
import { toggled } from "./MendGame";
import {
  CELLS,
  configOf,
  counted,
  CUTS,
  GARDENS,
  gardensFor,
  MEND_STEPS,
  mostSteps,
  newRound,
  parseState,
  playerAt,
  roles,
  twoPlayer,
  winnerOf,
  type TwoState,
} from "./model";
import { threadNear } from "./TeamThreads";
import { TwoPlayerPage } from "./TwoPlayerPage";

practiseLabInProcess();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
// jsdom's Blob cannot stream, which a link's compression needs; Node's can.
beforeEach(() => {
  vi.stubGlobal("Blob", NodeBlob);
  window.history.replaceState(null, "", "/two-player");
});
afterEach(() => vi.unstubAllGlobals());

const WAIT = { timeout: 10_000 };
const LIMIT = 30_000;
const { initialState } = twoPlayer;
const parse = (saved: Partial<Record<keyof TwoState, unknown>>) =>
  parseState({ ...initialState, ...saved } as TwoState, initialState);
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const game = () => document.querySelector("[data-game]") as HTMLElement;

describe("what a link may say", () => {
  it("keeps a whole sensible round, never running", () => {
    const state: TwoState = {
      ...initialState,
      game: "mend",
      garden: "xor",
      stage: "play",
      cuts: [0, 5, 20],
      cells: [1, 7],
      steps: 60,
      running: true,
      breaker: 1,
      score: [1, 2, 3, 4],
    };
    expect(parse(state)).toEqual({ ...state, running: false });
  });

  it("clamps everything else", () => {
    expect(
      parse({
        game: "chess",
        garden: "lava",
        seed: 1e9,
        stage: "end",
        teams: ["giant", "big", "small"],
        paces: "fast",
        breaker: 7,
        cuts: [1, 1, 99, -1, 2.5, "3"],
        cells: null,
        steps: 1e9,
        score: [-5, 1e9, NaN, "9"],
      }),
    ).toEqual({
      ...initialState,
      seed: 99,
      teams: ["middle", "big"],
      cuts: [1],
      score: [0, 99, 0, 0],
    });
  });

  it("opens no stage whose choices are missing, and no garden its game lacks", () => {
    expect(parse({ game: "mend", stage: "play", cuts: [1, 2] }).stage).toBe("one");
    expect(parse({ game: "mend", stage: "play", cuts: [1, 2, 3], cells: [1] }).stage).toBe("two");
    expect(parse({ game: "mend", garden: "spiral" }).garden).toBe("circles");
    expect(parse({ stage: "two", steps: 50, counted: true })).toMatchObject({
      steps: 0,
      counted: false,
    });
  });
});

describe("the rules", () => {
  const finish = (state: TwoState): LabMoment => {
    const config = configOf(state);
    if (!config) throw new Error("nothing to run");
    const run = createLabRun(config);
    for (let step = 0; step < mostSteps(state) && winnerOf(run.moment(), state) === null; step += 1)
      run.advance();
    return run.moment();
  };
  const race = (over: Partial<TwoState>): TwoState => ({ ...initialState, stage: "play", ...over });

  it.each(GARDENS)("a race on %s always ends with a winner or a tie", (garden) => {
    const state = race({ garden, teams: ["small", "big"], paces: ["steady", "careful"] });
    expect(winnerOf(finish(state), state)).not.toBeNull();
  });

  it("the same team against itself ties, and better choices win", () => {
    const tie = race({});
    expect(winnerOf(finish(tie), tie)).toBe("tie");
    const state = race({ paces: ["steady", "careful"] });
    expect(winnerOf(finish(state), state)).toBe(0);
    const swapped = race({ paces: ["careful", "steady"] });
    expect(winnerOf(finish(swapped), swapped)).toBe(1);
  });

  it("the repairer wins only by reaching the goal, and the two swap places", () => {
    for (const breaker of [0, 1]) {
      const state: TwoState = {
        ...initialState,
        game: "mend",
        stage: "play",
        breaker,
        cuts: [0, 20, 19],
        cells: [1, 4],
      };
      const moment = finish(state);
      if (moment.kind !== "mend") throw new Error("not a repair");
      expect(moment.step).toBe(MEND_STEPS);
      const { repairer, breaker: cutter } = roles(state);
      expect(repairer).not.toBe(cutter);
      expect(winnerOf(moment, state)).toBe(moment.right >= MEND_GOAL ? repairer : cutter);
    }
  });

  it(
    "every garden can be broken, and repaired too",
    () => {
      for (const garden of gardensFor("mend")) {
        const outcomes = new Set<unknown>();
        for (const cuts of [
          [0, 1, 2],
          [16, 17, 18],
          [19, 20, 21],
          [4, 12, 22],
        ])
          for (const cells of [
            [0, 1],
            [2, 5],
            [6, 7],
            [3, 4],
          ]) {
            const state: TwoState = {
              ...initialState,
              game: "mend",
              garden,
              stage: "play",
              cuts,
              cells,
            };
            outcomes.add(winnerOf(finish(state), state));
          }
        expect(outcomes, garden).toEqual(new Set([0, 1]));
      }
    },
    LIMIT,
  );

  it("a win counts once", () => {
    const state = race({ score: [2, 0, 0, 0] });
    const after = { ...state, ...counted(state, 0) };
    expect(after.score).toEqual([3, 0, 0, 0]);
    expect({ ...after, ...counted(after, 0) }.score).toEqual([3, 0, 0, 0]);
    expect({ ...state, ...counted({ ...state, game: "mend" }, 1) }.score).toEqual([2, 0, 0, 1]);
    expect({ ...state, ...counted(state, "tie") }.score).toEqual([2, 0, 0, 0]);
  });

  it("gives the screen to the right player", () => {
    const at = (over: Partial<TwoState>) => playerAt({ ...initialState, ...over });
    expect([at({ stage: "one" }), at({ stage: "pass" }), at({ stage: "two" })]).toEqual([0, 1, 1]);
    expect(at({ game: "mend", breaker: 1, stage: "one" })).toBe(1);
    expect(at({ game: "mend", breaker: 1, stage: "two" })).toBe(0);
  });

  it("lists never hold more than they may", () => {
    expect(toggled([1, 2], 2, 3)).toEqual([1]);
    expect(toggled([1, 2], 5, 2)).toEqual([1, 2]);
    expect(toggled([1], 5, 2)).toEqual([1, 5]);
    expect(newRound({ seed: 3 })).toMatchObject({ seed: 3, cuts: [], cells: [], stage: "one" });
  });

  it("a tap finds the nearest thread, and only a near one", () => {
    expect(threadNear(-200, -200)).toBeNull();
    const found = Array.from({ length: 360 }, (_, x) => threadNear(x, 200)).filter(
      (thread) => thread !== null,
    );
    expect(found.length).toBeGreaterThan(50);
    for (const thread of found) expect(thread).toBeLessThan(THREADS);
  });
});

describe("the page", () => {
  it(
    "plays a race from two hidden choices to a counted win",
    async () => {
      render(<TwoPlayerPage />);
      await screen.findByRole("heading", { name: "Player one, pick your team" }, WAIT);
      press("Hide my choice");
      // Nothing of the first player's choice is left on screen.
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "Now pass the screen to Player two.",
      );
      expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
      expect(screen.queryByRole("radio", { name: "Steady steps" })).toBeNull();
      press("I’m ready");
      fireEvent.click(screen.getByRole("radio", { name: "Careful steps" }));
      press("Hide my choice");
      press("Start the race");
      await vi.waitFor(() => expect(game().dataset.winner).toBe("0"), WAIT);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Player one wins!");
      expect(document.querySelector("[data-score]")).toHaveAttribute("data-score", "1-0");
      expect(progressStore.getState().achievements).toContain("race");
      press("Play another round");
      expect(game().dataset.stage).toBe("one");
      expect(document.querySelector("[data-score]")).toHaveAttribute("data-score", "1-0");
    },
    LIMIT,
  );

  it(
    "plays a break and a repair to a counted win, then swaps places",
    async () => {
      render(<TwoPlayerPage />);
      await screen.findByRole("heading", { name: "Player one, pick your team" }, WAIT);
      fireEvent.click(screen.getByRole("radio", { name: "Break and repair" }));
      const threads = screen.getAllByRole("button", { name: /, the thread / });
      expect(threads).toHaveLength(THREADS);
      expect(screen.getByRole("button", { name: "Hide my choice" })).toBeDisabled();
      for (const thread of threads.slice(0, CUTS)) fireEvent.click(thread);
      // A fourth cut is not on offer.
      expect(threads[CUTS]).toBeDisabled();
      expect(document.querySelectorAll("[data-cut]")).toHaveLength(CUTS);
      press("Hide my choice");
      expect(document.querySelector("[data-cut]")).toBeNull();
      press("I’m ready");
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^Player two, pick/);
      for (const cell of [4, 5].slice(0, CELLS)) press(`Cell ${cell}`);
      press("Send them to practise");
      await vi.waitFor(() => expect(game().dataset.winner).toMatch(/[01]/), WAIT);
      expect(progressStore.getState().achievements).toContain("mend");
      press("Swap places and play again");
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "Player two, cut three threads",
      );
    },
    LIMIT,
  );

  it(
    "replays a linked round to the same end, and counts it once",
    async () => {
      const state: TwoState = {
        ...initialState,
        stage: "play",
        teams: ["middle", "big"],
        steps: mostSteps(initialState),
        counted: true,
        score: [4, 1, 0, 0],
      };
      const link = await encodeSnapshot({
        id: twoPlayer.id,
        state,
        guesses: {},
        touched: true,
        momentEpoch: null,
      });
      window.history.replaceState(null, "", `/two-player${hashFor(link)}`);
      render(<TwoPlayerPage />);
      await vi.waitFor(() => expect(game()?.dataset.winner).toBe("0"), WAIT);
      await act(async () => undefined);
      expect(document.querySelector("[data-score]")).toHaveAttribute("data-score", "4-1");
    },
    LIMIT,
  );
});
