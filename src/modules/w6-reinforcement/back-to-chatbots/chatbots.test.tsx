import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { CHECKS, words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  chatRun,
  isFinished,
  judgeOf,
  ONLY_FLATTERS,
  oldSelf,
  praiseOf,
  type ChatFrame,
  type ChatState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as ChatState;
const at = (change: Partial<ChatState>): ChatState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: ChatState) => [...chatRun(state)].at(-1) as ChatFrame;
const rightShare = (chances: number[][]) =>
  Math.min(
    ...chances.map((question, index) =>
      question.reduce(
        (sum, chance, answer) => sum + (CHECKS[index]?.answers[answer]?.correct ? chance : 0),
        0,
      ),
    ),
  );

const unleashed = lastOf(at({ leash: 0, train: 1 }));
const usual = lastOf(at({ train: 1 }));

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `back-to-chatbots-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("back to chatbots: the crowd, the judge and the training", () => {
  it("teaches the judge a liking for praise only when the crowd has one", () => {
    expect(judgeOf(0).flatters).toBeLessThan(0.1);
    expect(judgeOf(0.5).flatters).toBeGreaterThan(1);
    expect(judgeOf(0.5).correct).toBeGreaterThan(1);
  });

  it("starts as its old self: mostly right, praising about a third of the time", () => {
    const old = oldSelf();
    expect(praiseOf(old)).toBeGreaterThan(0.25);
    expect(praiseOf(old)).toBeLessThan(0.35);
    expect(rightShare(old)).toBeGreaterThan(0.6);
  });

  it("only flatters when over-trained with the leash off (measured)", () => {
    expect(unleashed.praise).toBeGreaterThanOrEqual(ONLY_FLATTERS);
    // The leash at its starting setting holds it back however long it trains.
    expect(usual.praise).toBeLessThan(0.75);
    // A crowd that does not care for praise leaves nothing to chase.
    expect(lastOf(at({ taste: 0, leash: 0, train: 1 })).praise).toBeLessThan(0.4);
    expect(rightShare(lastOf(at({ taste: 0, leash: 0, train: 1 })).chances)).toBeGreaterThan(
      rightShare(oldSelf()),
    );
  });

  it("replays the same run for a link", () => {
    expect([...chatRun(at({ train: 0.3 }))]).toEqual([...chatRun(at({ train: 0.3 }))]);
  });
});

describe("back to chatbots: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires for a finished run that praises in nearly every answer", () => {
    expect(mission.when(at({ leash: 0, train: 1 }), unleashed)).toBe(true);
    expect(mission.when(at({ train: 1 }), usual)).toBe(false);
    // A frame from another setting, or a run still going, does not count.
    expect(mission.when(at({ leash: 0, train: 0.9 }), unleashed)).toBe(false);
    const early = [...chatRun(at({ leash: 0, train: 1 }))][3];
    expect(mission.when(at({ leash: 0, train: 1 }), early)).toBe(false);
  });

  it("answers the no-leash question from a finished, very long, unleashed run", () => {
    expect(guess.answer(at({ leash: 0, train: 1 }), unleashed)).toBe("flatters");
    expect(guess.answer(at({ train: 1 }), usual)).toBeNull();
    const plain = at({ taste: 0, leash: 0, train: 1 });
    expect(guess.answer(plain, lastOf(plain))).toBe("helpful");
  });
});

describe("back to chatbots: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { taste: 4, train: -1, leash: 1e9, runs: 2.5e9 } as unknown as ChatState,
      initial,
    ) as ChatState;
    expect(safe.taste).toBe(1);
    expect(safe.train).toBe(0);
    expect(safe.leash).toBe(1);
    expect(safe.runs).toBe(10_000);
  });

  it("describes the chatbot before, during and after training", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), undefined)).toBe(words.describe.working);
    expect(isFinished(at({ leash: 0, train: 1 }), unleashed)).toBe(true);
    expect(definition.describe?.(at({ leash: 0, train: 1 }), unleashed)).toContain(
      words.verdict.flatters,
    );
  });
});

describe("back to chatbots: in the lesson", () => {
  it("shows its old self, then trained answers", async () => {
    renderLesson();
    expect(screen.getByText(words.oldSelf)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    await waitFor(() => expect(screen.getByText(words.trained)).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 20_000);

  it("earns the star once it only flatters", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.leash.label }).focus();
    await userEvent.keyboard("{Home}");
    screen.getByRole("slider", { name: words.train.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
  }, 20_000);
});
