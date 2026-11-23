import { Blob as NodeBlob } from "node:buffer";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { practiseLabInProcess } from "@/engine/lab/testing/in-process-lab";
import { GARDEN_MODELS } from "@/engine/lab/garden-run";
import { BOARD_AGENTS } from "@/engine/lab/board-run";
import { createLabRun } from "@/engine/lab/lab-run";
import { encodeSnapshot, hashFor } from "@/platform/snapshot/snapshot";
import { SandboxPage } from "./SandboxPage";
import {
  BOARDS,
  boardTrouble,
  COLUMNS,
  configOf,
  GARDENS,
  mostSteps,
  ROWS,
  sandbox,
  START,
  type SandboxState,
} from "./model";

practiseLabInProcess();
// jsdom's Blob cannot stream, which a link's compression needs; Node's can.
beforeEach(() => void vi.stubGlobal("Blob", NodeBlob));
afterEach(() => vi.unstubAllGlobals());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));

const WAIT = { timeout: 10_000 };
const LIMIT = 30_000;
const { initialState, parseState } = sandbox;
const parse = (saved: Partial<Record<keyof SandboxState, unknown>>) =>
  parseState({ ...initialState, ...saved } as SandboxState, initialState);

describe("what a link may say", () => {
  it("keeps a whole sensible state, except that it never opens running", () => {
    const state: SandboxState = {
      ...initialState,
      place: "board",
      board: "own",
      agent: "coach",
      steps: 20,
      seed: 7,
      points: [{ x: 0.5, y: -0.25, label: 1 }],
      running: true,
    };
    expect(parse(state)).toEqual({ ...state, running: false });
  });

  it("clamps everything else", () => {
    const wild = parse({
      place: "moon",
      garden: "lava",
      model: "oracle",
      agent: "cheat",
      board: "maze",
      brush: 99,
      boardBrush: "ufo",
      seed: -4,
      steps: 1e9,
      points: [{ x: 5, y: 0, label: 0 }, null, { x: 0, y: 0, label: 7 }],
      tiles: ["wall", "ufo"],
    });
    expect(wild).toMatchObject({
      place: "garden",
      garden: "circles",
      model: "team",
      agent: "scores",
      board: "kitchen",
      brush: 2,
      boardBrush: "wall",
      seed: 1,
      steps: mostSteps(initialState),
      points: [],
    });
    expect(wild.tiles).toHaveLength(COLUMNS * ROWS);
    expect(parse({ tiles: Array(COLUMNS * ROWS).fill("wall") }).tiles[START]).toBe("floor");
    expect(parse({ steps: -3 }).steps).toBe(0);
  });
});

describe("every pair can be learned", () => {
  it.each(GARDENS.filter((garden) => garden !== "own"))("%s, with every learner", (garden) => {
    for (const model of GARDEN_MODELS) {
      const config = configOf({ ...initialState, garden, model });
      if (!config) throw new Error("nothing to learn from");
      const run = createLabRun(config);
      run.advance();
      expect(run.moment().step).toBe(1);
    }
  });

  it.each(BOARDS)("the %s board, with every learner", (board) => {
    expect(boardTrouble({ ...initialState, board })).toBeNull();
    for (const agent of BOARD_AGENTS) {
      const config = configOf({ ...initialState, place: "board", board, agent });
      if (!config) throw new Error("no board");
      const run = createLabRun(config);
      run.advance();
      expect(run.moment().step).toBe(1);
    }
  });

  it("a garden of one kind of dot is nothing to learn from", () => {
    expect(configOf({ ...initialState, garden: "own", points: [] })).toBeNull();
    expect(
      configOf({ ...initialState, garden: "own", points: [{ x: 0, y: 0, label: 0 }] }),
    ).toBeNull();
  });
});

const steps = () => Number(document.querySelector("[data-steps]")?.getAttribute("data-steps"));
const right = () => document.querySelector("[data-right]")?.getAttribute("data-right");
const button = (name: string) => screen.getByRole("button", { name });

async function openAt(state: Partial<SandboxState> | null) {
  window.history.replaceState(null, "", "/sandbox");
  if (state) {
    const encoded = await encodeSnapshot({
      id: "sandbox",
      state: { ...initialState, ...state },
      touched: true,
      guesses: {},
      momentEpoch: null,
    });
    window.history.replaceState(null, "", `/sandbox${hashFor(encoded)}`);
  }
  const page = render(<SandboxPage />);
  await screen.findByRole("button", { name: "Start practising" }, WAIT).catch(() => null);
  return page;
}

describe("the sandbox page", () => {
  it(
    "practises to the end, counts its work, and starts over cleanly",
    async () => {
      await openAt(null);
      expect(steps()).toBe(0);
      fireEvent.click(button("Start practising"));
      await waitFor(() => expect(steps()).toBe(mostSteps(initialState)), WAIT);
      await screen.findAllByText(/in the right group/, undefined, WAIT);
      const times = document
        .querySelector("[data-multiplications]")
        ?.getAttribute("data-multiplications");
      expect(Number(times)).toBeGreaterThan(100_000);
      const finished = right();
      fireEvent.click(button("Practise again"));
      await waitFor(() => expect(steps()).toBeLessThan(mostSteps(initialState)), WAIT);
      await waitFor(() => expect(button("Practise again")).toBeInTheDocument(), WAIT);
      expect(right()).toBe(finished);
      fireEvent.click(button("Start over"));
      await waitFor(() => expect(steps()).toBe(0), WAIT);
    },
    LIMIT,
  );

  it(
    "a link replays to the very same moment, without running",
    async () => {
      const link = { model: "relay", garden: "moons", steps: 25 } as const;
      const config = configOf({ ...initialState, ...link });
      if (!config) throw new Error("nothing to practise on");
      const run = createLabRun(config);
      for (let step = 0; step < link.steps; step += 1) run.advance();
      const moment = run.moment();
      const expected = moment.kind === "garden" ? `${moment.right}` : "";
      const first = await openAt(link);
      await waitFor(() => expect(right()).toBe(expected), WAIT);
      expect(document.querySelector("[data-run]")).toHaveAttribute("data-run", "off");
      expect(screen.getByText("You are looking at someone else’s view.")).toBeInTheDocument();
      first.unmount();
      await openAt(link);
      await waitFor(() => expect(right()).toBe(expected), WAIT);
      expect(steps()).toBe(25);
      fireEvent.click(button("Start from your own view"));
      await waitFor(() => expect(steps()).toBe(0), WAIT);
    },
    LIMIT,
  );

  it(
    "changing a dial while it practises starts the new pair from nothing",
    async () => {
      await openAt(null);
      fireEvent.click(button("Start practising"));
      fireEvent.click(screen.getByRole("radio", { name: "Twenty questions" }));
      await waitFor(
        () => expect(document.querySelector("[data-run]")).toHaveAttribute("data-run", "off"),
        WAIT,
      );
      await act(async () => {
        await new Promise((done) => setTimeout(done, 100));
      });
      expect(steps()).toBe(0);
      fireEvent.click(screen.getByRole("radio", { name: "A board to walk" }));
      fireEvent.click(await screen.findByRole("radio", { name: "A planner with a map" }));
      fireEvent.click(button("Start practising"));
      await screen.findAllByText(/It would reach the bowl/, undefined, WAIT);
      await waitFor(() => expect(button("Practise again")).toBeInTheDocument(), WAIT);
      await screen.findAllByText(/finds the bowl nearly every time/, undefined, WAIT);
    },
    LIMIT,
  );

  it("says why a damaged link, or a lesson's link, could not be opened", async () => {
    window.history.replaceState(null, "", "/sandbox#s=not-a-link");
    render(<SandboxPage />);
    await waitFor(
      () => expect(document.querySelector("[data-link-problem]")).toBeInTheDocument(),
      WAIT,
    );
    expect(button("Start practising")).toBeEnabled();
  });

  it("an empty garden cannot be practised on, and says what to do", async () => {
    await openAt({ garden: "own", points: [] });
    await screen.findAllByText(/Plant some dots of both kinds/, undefined, WAIT);
    expect(button("Start practising")).toBeDisabled();
  });
});
