import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  BEATS_PARTNER,
  DEFAULT_GAMES,
  EVEN,
  GAMES,
  isFinished,
  LOSES_TO_NEWCOMER,
  practiceRun,
  startOf,
  type PracticeFrame,
  type PracticeState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as PracticeState;
const at = (change: Partial<PracticeState>): PracticeState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: PracticeState) => [...practiceRun(state)].at(-1) as PracticeFrame;
/** Curiosity on every step of its dial up to `top`. */
const curiosities = (top = 1) =>
  Array.from({ length: Math.round(top * 20) + 1 }, (_, step) => step / 20);

const learning = lastOf(at({}));
const frozen = lastOf(at({ frozen: true }));
const [mission] = missions;
const [guess] = predictions;

describe("practising against yourself: measured", () => {
  it("copies that both learn trade wins, and Pip beats the newcomer", () => {
    expect(learning.pipShare).toBeGreaterThan(EVEN.low);
    expect(learning.pipShare).toBeLessThan(EVEN.high);
    expect(learning.testShare).toBe(1);
    expect(learning.pipKnows).toBe(16);
  });

  it("against a frozen Pop, Pip wins nearly every game but loses to the newcomer", () => {
    expect(frozen.pipShare).toBeGreaterThanOrEqual(BEATS_PARTNER);
    expect(frozen.testShare).toBeLessThanOrEqual(LOSES_TO_NEWCOMER);
    // At a thousand games the trick holds for every curiosity up to 0.45.
    for (const curiosity of curiosities(0.45)) {
      const frame = lastOf(at({ frozen: true, curiosity }));
      expect(frame.pipShare, `${curiosity}`).toBeGreaterThanOrEqual(BEATS_PARTNER);
      expect(frame.testShare, `${curiosity}`).toBeLessThanOrEqual(LOSES_TO_NEWCOMER);
    }
  }, 20_000);

  it("trades wins evenly at every curiosity from a thousand games up", () => {
    for (let games = DEFAULT_GAMES; games < GAMES.length; games += 1)
      for (const curiosity of curiosities()) {
        const share = lastOf(at({ games, curiosity })).pipShare ?? 0;
        expect(share, `${games}/${curiosity}`).toBeGreaterThanOrEqual(EVEN.low);
        expect(share, `${games}/${curiosity}`).toBeLessThanOrEqual(EVEN.high);
      }
  }, 30_000);

  it("records a frame per fiftieth of the games, the start first, the same every time", () => {
    const frames = [...practiceRun(at({ games: 0 }))];
    expect(frames[0]?.epoch).toBe(0);
    expect(frames[0]?.pipShare).toBeNull();
    expect(frames.at(-1)?.epoch).toBe(GAMES[0]);
    expect(frames).toHaveLength(GAMES[0] + 1);
    expect([...practiceRun(at({ games: 0 }))]).toEqual(frames);
    expect(startOf(at({}))).toEqual([...practiceRun(at({}))][0]);
  });
});

describe("practising against yourself: mission and guess", () => {
  it("fires for a frozen Pop's cheap trick, and not otherwise", () => {
    expect(mission.when(at({ frozen: true }), frozen)).toBe(true);
    // Near misses: both learning; a frame from another setting; practice not finished.
    expect(mission.when(at({}), learning)).toBe(false);
    expect(mission.when(at({ frozen: true, games: 3 }), frozen)).toBe(false);
    const early = [...practiceRun(at({ frozen: true }))][10];
    expect(mission.when(at({ frozen: true }), early)).toBe(false);
  });

  it("answers from a finished practice where both learn", () => {
    expect(guess.answer(at({}), learning)).toBe("even");
    expect(guess.answer(at({ frozen: true }), frozen)).toBeNull();
    expect(guess.answer(at({ games: 1 }), lastOf(at({ games: 1 })))).toBeNull();
    expect(guess.answer(at({}), undefined)).toBeNull();
  });
});

describe("practising against yourself: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { games: 40, curiosity: 0.333, frozen: "yes", runs: -4 } as unknown as PracticeState,
      initial,
    ) as PracticeState;
    expect(safe).toEqual({ games: GAMES.length - 1, curiosity: 0.35, frozen: false, runs: 0 });
  });

  it("compares Pop frozen with Pop learning", () => {
    expect(definition.compare?.(initial)).toMatchObject({ frozen: true });
  });

  it("describes practice before and after", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), undefined)).toBe(words.describe.working);
    expect(isFinished(at({ frozen: true }), frozen)).toBe(true);
    expect(definition.describe?.(at({ frozen: true }), frozen)).toMatch(/newcomer/);
  });
});

describe("practising against yourself: in the lesson", () => {
  let lessons = 0;
  const renderLesson = () =>
    render(
      <ModuleShell
        lesson={{ ...valleyLesson, id: `practising-against-yourself-${(lessons += 1)}` }}
        module={definition}
      />,
    );

  it("practises and shows how Pip is doing", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    await waitFor(
      () =>
        expect(document.querySelector("[data-result]")?.textContent).toMatch(
          /Lately Pip wins .* Pip won/,
        ),
      { timeout: 10_000 },
    );
    expect(document.querySelector("[data-habits]")).not.toBeNull();
  }, 15_000);

  it("earns the star when a frozen Pop teaches Pip a cheap trick", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("switch", { name: words.frozen }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 15_000);
});
