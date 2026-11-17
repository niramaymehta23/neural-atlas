import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { CELLS, COLUMNS, drawRun, READY, type DrawFrame, type DrawState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as DrawState;
const at = (change: Partial<DrawState>): DrawState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: DrawState) => [...drawRun(state)].at(-1) as DrawFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `it-can-draw-anything-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("it can draw anything: the cells", () => {
  it("records a short run that ends on its last round", () => {
    const frames = [...drawRun(at({}))];
    expect(frames.length).toBeLessThanOrEqual(121);
    expect(frames.at(-1)?.epoch).toBe(frames.at(-1)?.rounds);
    expect(frames.at(-1)!.loss).toBeLessThan(frames[0]!.loss);
  });

  it("copies a wave closely with many cells, but not with one", () => {
    expect(lastOf(at({ cells: 20 })).loss).toBeLessThan(0.005);
    expect(lastOf(at({ cells: 1 })).loss).toBeGreaterThan(0.1);
  });

  it("is the same run every time, so a link replays it", () => {
    expect([...drawRun(at({ cells: 3 }))]).toEqual([...drawRun(at({ cells: 3 }))]);
  });
});

describe("it can draw anything: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when too few cells are still far off a bumpy squiggle", () => {
    const few = at({ cells: 1 });
    expect(mission.when(few, lastOf(few))).toBe(true);
    const zigzag = at({ cells: 2, heights: [...READY.zigzag] });
    expect(mission.when(zigzag, lastOf(zigzag))).toBe(true);
  });

  it("does not fire with enough cells, a simple squiggle or an unfinished run", () => {
    const many = at({ cells: 6 });
    expect(mission.when(many, lastOf(many))).toBe(false);
    const flat = at({ cells: 1, heights: Array.from({ length: COLUMNS }, () => 0.3) });
    expect(mission.when(flat, lastOf(flat))).toBe(false);
    const few = at({ cells: 1 });
    expect(mission.when(few, [...drawRun(few)][2])).toBe(false);
  });

  it("answers the guess from twenty cells practising the zigzag", () => {
    const zigzag = at({ cells: CELLS.max, heights: [...READY.zigzag] });
    expect(guess.answer(zigzag, lastOf(zigzag))).toBe("yes");
    expect(guess.answer(at({ cells: 6 }), lastOf(at({ cells: 6 })))).toBeNull();
    expect(guess.answer(zigzag, undefined)).toBeNull();
  });
});

describe("it can draw anything: links and words", () => {
  it("keeps a hand-made link on its dials and its squiggle the right length", () => {
    const safe = definition.parseState!(
      {
        heights: [5, "x", -3, ...Array(60).fill(0.123)],
        cells: 99,
        practice: 2,
        runs: -1,
      } as unknown as DrawState,
      initial,
    ) as DrawState;
    expect(safe.heights).toHaveLength(COLUMNS);
    expect(safe.heights.slice(0, 4)).toEqual([1, 0, -1, 0.12]);
    expect(safe).toMatchObject({ cells: CELLS.max, practice: 1, runs: 0 });
    const missing = definition.parseState!(
      { heights: "no" } as unknown as DrawState,
      initial,
    ) as DrawState;
    expect(missing.heights).toEqual(initial.heights);
  });

  it("describes the cells before and after practice", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/Six cells/);
    const one = at({ cells: 1 });
    expect(definition.describe?.(one, lastOf(one))).toBe(`One cell: ${words.howClose.far}`);
  });
});

describe("it can draw anything: in the lesson", () => {
  it("lets a keyboard move a spot of the squiggle", async () => {
    renderLesson();
    const drawing = screen.getByRole("slider", { name: words.draw.label });
    drawing.focus();
    expect(drawing).toHaveAttribute("aria-valuetext", expect.stringMatching(/^Spot one of/));
    const before = Number(drawing.getAttribute("aria-valuenow"));
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowUp}");
    expect(drawing).toHaveAttribute("aria-valuetext", expect.stringMatching(/^Spot three of/));
    expect(Number(drawing.getAttribute("aria-valuenow"))).toBeCloseTo(
      (READY.wave[2] ?? 0) + 0.1,
      2,
    );
    expect(before).toBe(READY.wave[0]);
  });

  it("draws where a mouse presses", () => {
    renderLesson();
    const svg = document.querySelector("[data-drawing]") as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 320,
        height: 200,
        right: 320,
        bottom: 200,
        x: 0,
        y: 0,
      }) as DOMRect;
    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: "mouse", clientX: 5, clientY: 100 });
    fireEvent.pointerUp(svg, { pointerId: 1 });
    const drawing = screen.getByRole("slider", { name: words.draw.label });
    drawing.focus();
    expect(Number(drawing.getAttribute("aria-valuenow"))).toBe(0);
  });

  it("earns the star once too few cells can't follow the squiggle", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.cells.label }).focus();
    await userEvent.keyboard("{Home}");
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });
});
