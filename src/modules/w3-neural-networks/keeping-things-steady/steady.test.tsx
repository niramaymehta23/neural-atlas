import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  isFinished,
  outcomeOf,
  ROUNDS,
  signalsAtEnd,
  steadyEnd,
  steadyRun,
  type SteadyState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as SteadyState;
const at = (change: Partial<SteadyState>): SteadyState => ({ ...initial, runs: 1, ...change });
const deep = at({ layers: 8 });
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `steady-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("keeping things steady: the stack", () => {
  it("records a whole practice, the same one every time", () => {
    const frames = Array.from(steadyRun(at({})));
    expect(frames.at(-1)?.epoch).toBe(ROUNDS);
    expect(Array.from(steadyRun(at({})))).toEqual(frames);
    expect(isFinished(at({}), frames.at(-1))).toBe(true);
    expect(isFinished(deep, frames.at(-1))).toBe(false);
  });

  it("learns when shallow, stalls when very deep, and learns again when calm", () => {
    expect(outcomeOf(steadyEnd(at({})))).not.toBe("stalled");
    const end = steadyEnd(deep);
    expect(outcomeOf(end)).toBe("stalled");
    expect(signalsAtEnd(deep, end.params)).toBe("faded");
    const calm = { ...deep, calm: true };
    const calmEnd = steadyEnd(calm);
    expect(outcomeOf(calmEnd)).toBe("learned");
    expect(signalsAtEnd(calm, calmEnd.params)).toBe("lively");
  });

  it("gets wild starting signals stuck at the ends", () => {
    const wild = at({ layers: 12, wild: 1 });
    expect(signalsAtEnd(wild, steadyRun(wild).next().value?.params ?? [])).toBe("blown");
  });
});

describe("keeping things steady: mission and guess", () => {
  it("fires when a very deep stack without calming stalls", () => {
    expect(mission.when(deep, steadyEnd(deep))).toBe(true);
  });

  it("does not fire when calm, shallow, or before the practice ends", () => {
    expect(mission.when(at({}), steadyEnd(at({})))).toBe(false);
    const calm = { ...deep, calm: true };
    expect(mission.when(calm, steadyEnd(calm))).toBe(false);
    expect(mission.when(deep, Array.from(steadyRun(deep))[4])).toBe(false);
  });

  it("answers from a finished deep run without calming", () => {
    expect(guess.answer(deep, steadyEnd(deep))).toBe("change");
    expect(guess.answer(at({}), steadyEnd(at({})))).toBeNull();
    const calm = { ...deep, calm: true };
    expect(guess.answer(calm, steadyEnd(calm))).toBeNull();
  });
});

describe("keeping things steady: links and words", () => {
  it("keeps a hand-made link's numbers on their dials", () => {
    const saved = { layers: 99, wild: -2, calm: 1, runs: 3.7 } as unknown as SteadyState;
    expect(definition.parseState?.(saved, initial)).toEqual({
      layers: 12,
      wild: 0,
      calm: false,
      runs: 4,
    });
  });

  it("says how the practice went and what the signals look like", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(deep, steadyEnd(deep))).toBe(
      `${words.outcome.stalled} ${words.signals.faded}`,
    );
  });

  it("compares with signals kept calm", () => {
    expect(definition.compare?.(deep).calm).toBe(true);
  });
});

describe("keeping things steady: in the lesson", () => {
  it("earns the star when a very deep stack stalls", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.layersDial.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    await waitFor(() =>
      expect(document.querySelector("[data-outcome]")).toHaveTextContent(words.outcome.stalled),
    );
  });
});
