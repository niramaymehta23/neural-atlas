import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Blob as NodeBlob } from "node:buffer";
import { useEffect } from "react";
import type { Timeline } from "@/engine/timeline/timeline";
import type { LessonModule, ModuleState, ModuleViewProps, TimelineFrame } from "./contract";
import { valleyLesson, valleyModule } from "./fixture/fixture-module";
import { ModuleShell } from "./ModuleShell";
import { progressStore } from "./progress/progress";

type Valley = { step: number; steps: number };
const [flyOff] = valleyModule.missions;

let lessonCount = 0;
const lessonFor = () => ({ ...valleyLesson, id: `hardening-${(lessonCount += 1)}` });

async function turnDialTo(value: "End" | "Home") {
  screen.getByRole("slider", { name: "How big a step" }).focus();
  await userEvent.keyboard(`{${value}}`);
}

const takeSteps = async (count: number) => {
  for (let i = 0; i < count; i += 1) {
    await userEvent.click(screen.getByRole("button", { name: "Take a step" }));
  }
};

/** A scene that hands its timeline to the test. */
function timelineSpy() {
  const seen: { main?: Timeline<TimelineFrame>; alternative?: Timeline<TimelineFrame> } = {};
  const Scene = ({ timeline, side }: ModuleViewProps<ModuleState>) => {
    seen[side] = timeline;
    return null;
  };
  return { seen, Scene: Scene as LessonModule["scene"] };
}

describe("ModuleShell hardening", () => {
  it("keeps the dials working when the scene throws (PLT-04)", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Broken = () => {
      throw new Error("scene broke");
    };
    render(<ModuleShell lesson={lessonFor()} module={{ ...valleyModule, scene: Broken }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong here.");
    expect(screen.getByRole("slider", { name: "How big a step" })).toBeVisible();
  });

  it("asks for the guess before the start button on first load (LIVE-11)", () => {
    render(<ModuleShell lesson={lessonFor()} module={valleyModule} />);
    const dock = screen.getByRole("complementary", { name: "Dials" });
    const guess = within(dock).getByRole("region", { name: "Make a guess" });
    const start = within(dock).getByRole("button", { name: "Take a step" });
    expect(guess.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(guess).toHaveTextContent("Guess first, then press start.");
  });

  it("locks the guess once the outcome is showing (PLT-09)", async () => {
    render(<ModuleShell lesson={lessonFor()} module={valleyModule} />);
    await userEvent.click(screen.getByRole("button", { name: "At the bottom" }));
    await turnDialTo("End");
    await takeSteps(3);
    const other = screen.getByRole("button", { name: "Flying off" });
    expect(other).toBeDisabled();
    await userEvent.click(other);
    expect(screen.getByRole("button", { name: "At the bottom" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Your guess is locked in now that it’s happening.")).toBeVisible();
  });

  it("moves focus into the guess card after revealing (PLT-15)", async () => {
    render(<ModuleShell lesson={lessonFor()} module={valleyModule} />);
    await userEvent.click(screen.getByRole("button", { name: "Flying off" }));
    await turnDialTo("End");
    await takeSteps(3);
    screen.getByRole("button", { name: "Show me what happens" }).focus();
    await userEvent.keyboard("{Enter}");
    const region = screen.getByRole("region", { name: "Make a guess" });
    await waitFor(() => expect(region).toContainElement(document.activeElement as HTMLElement));
  });

  it("announces through one status region that exists before anything happens (PLT-14)", async () => {
    const { container } = render(<ModuleShell lesson={lessonFor()} module={valleyModule} />);
    const before = container.querySelector("[data-announcer]");
    expect(before).toHaveAttribute("role", "status");
    expect(before).toBeEmptyDOMElement();
    await turnDialTo("End");
    await takeSteps(2);
    const after = container.querySelector("[data-announcer]");
    expect(after).toBe(before);
    expect(after).toHaveTextContent(flyOff.success);
  });

  it("queues missions that fire together and shows each in turn (PLT-07)", async () => {
    const both: LessonModule = {
      ...valleyModule,
      missions: [flyOff, { ...flyOff, id: "also", goal: "Also", success: "Also broke." }],
    };
    render(<ModuleShell lesson={lessonFor()} module={both} />);
    await turnDialTo("End");
    await takeSteps(2);
    expect(screen.getByText(flyOff.success)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "On to the next mission" }));
    expect(screen.getByText("Also broke.")).toBeVisible();
  });

  it("shows a newer mission's result over the puzzle's pinned one (PLT-07)", async () => {
    const pinned: LessonModule = {
      ...valleyModule,
      missions: [
        { ...flyOff, id: "pinned", goal: "Pinned goal", when: () => false },
        { ...flyOff, id: "b", success: "B broke." },
      ],
    };
    render(<ModuleShell lesson={lessonFor()} module={pinned} focusMission="pinned" />);
    expect(screen.getByText("Pinned goal")).toBeVisible();
    await turnDialTo("End");
    await takeSteps(2);
    expect(screen.getByText("B broke.")).toBeVisible();
  });

  it("hands out no star for a mission a shared link already meets (PLT-08)", async () => {
    render(
      <ModuleShell
        lesson={lessonFor()}
        module={valleyModule}
        restored={{
          v: 2,
          id: valleyLesson.id,
          state: { step: 0.9, steps: 4 },
          touched: true,
          guesses: {},
          momentEpoch: null,
        }}
      />,
    );
    await act(() => progressStore.ready);
    expect(screen.queryByText("You earned a star.")).toBeNull();
    // The learner can still make their own guess and reveal it.
    await userEvent.click(screen.getByRole("button", { name: "Flying off" }));
    await userEvent.click(screen.getByRole("button", { name: "Show me what happens" }));
    expect(screen.getByText("You guessed: Flying off")).toBeVisible();
  });

  it("replays the newest moment's window even when the timeline is scrubbed back (PLT-05)", async () => {
    const lesson = lessonFor();
    const { seen, Scene } = timelineSpy();
    const late: LessonModule = {
      ...valleyModule,
      scene: Scene,
      missions: [
        {
          ...flyOff,
          replay: { before: 2, after: 0 },
          when: (_s, frame) => (frame?.epoch ?? 0) >= 10,
        },
      ],
    };
    render(<ModuleShell lesson={lesson} module={late} />);
    const timeline = seen.main!;
    act(() => {
      for (let epoch = 0; epoch < 10; epoch += 1) timeline.record({ epoch, loss: 1 });
      timeline.seek(2);
      timeline.record({ epoch: 10, loss: 1 });
    });
    await userEvent.click(await screen.findByRole("button", { name: "Watch why it happened" }));
    expect(timeline.current()?.epoch).toBeGreaterThanOrEqual(8);
  });

  it("offers no replay for a mission that fired on the first moment (PLT-25)", async () => {
    const { seen, Scene } = timelineSpy();
    const first: LessonModule = {
      ...valleyModule,
      scene: Scene,
      missions: [{ ...flyOff, when: (_s, frame) => frame !== undefined }],
    };
    render(<ModuleShell lesson={lessonFor()} module={first} />);
    act(() => seen.main!.record({ epoch: 0, loss: 1 }));
    expect(await screen.findByText(flyOff.success)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Watch why it happened" })).toBeNull();
  });

  it("stops waiting for a link's moment once the learner changes something (PLT-11)", async () => {
    const { seen, Scene } = timelineSpy();
    render(
      <ModuleShell
        lesson={lessonFor()}
        module={{ ...valleyModule, scene: Scene }}
        restored={{
          v: 2,
          id: valleyLesson.id,
          state: { step: 0.2, steps: 0 },
          touched: false,
          guesses: {},
          momentEpoch: 5,
        }}
      />,
    );
    await turnDialTo("Home");
    act(() => {
      for (let epoch = 0; epoch <= 6; epoch += 1) seen.main!.record({ epoch, loss: 1 });
    });
    expect(seen.main!.getState().live).toBe(true);
  });

  it("keeps the compare halves on one moment (PLT-17)", async () => {
    const recorded: Record<string, Timeline<TimelineFrame>> = {};
    const Recorder = ({ timeline, side }: ModuleViewProps<ModuleState>) => {
      recorded[side] = timeline;
      useEffect(() => {
        if (timeline.getState().length > 0) return;
        for (let epoch = 0; epoch < 10; epoch += 1) timeline.record({ epoch, loss: 1 });
      }, [timeline]);
      return null;
    };
    render(
      <ModuleShell
        lesson={lessonFor()}
        module={{ ...valleyModule, scene: Recorder as LessonModule["scene"] }}
      />,
    );
    await userEvent.click(screen.getByRole("switch", { name: "Compare side by side" }));
    act(() => recorded.main!.seek(4));
    expect(recorded.alternative!.current()?.epoch).toBeLessThanOrEqual(4);
    expect(recorded.alternative!.getState().live).toBe(false);
  });

  it("does not re-render the scene for every recorded moment (PLT-20)", () => {
    let renders = 0;
    let timeline: Timeline<TimelineFrame> | undefined;
    const Counting = (props: ModuleViewProps<ModuleState>) => {
      renders += 1;
      timeline = props.timeline;
      return null;
    };
    render(
      <ModuleShell
        lesson={lessonFor()}
        module={{ ...valleyModule, scene: Counting as LessonModule["scene"] }}
      />,
    );
    const before = renders;
    act(() => {
      for (let epoch = 0; epoch < 10; epoch += 1) timeline!.record({ epoch, loss: 1 });
    });
    expect(renders).toBe(before);
  });

  it("returns to live training with Back to now (PLT-19)", async () => {
    const { seen, Scene } = timelineSpy();
    render(<ModuleShell lesson={lessonFor()} module={{ ...valleyModule, scene: Scene }} />);
    act(() => {
      for (let epoch = 0; epoch < 10; epoch += 1) seen.main!.record({ epoch, loss: 1 });
      seen.main!.seek(3);
    });
    await userEvent.click(screen.getByRole("button", { name: "Back to now" }));
    expect(seen.main!.getState().live).toBe(true);
  });
});

describe("sharing a view (PLT-03, PLT-12)", () => {
  const original = navigator.clipboard;
  // jsdom's Blob cannot stream, which the link's compression needs; Node's can.
  beforeEach(() => vi.stubGlobal("Blob", NodeBlob));
  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: original, configurable: true });
  });

  const setClipboard = (value: unknown) =>
    Object.defineProperty(navigator, "clipboard", { value, configurable: true });

  it("shows the link to copy by hand when there is no clipboard", async () => {
    setClipboard(undefined);
    render(<ModuleShell lesson={lessonFor()} module={valleyModule} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy a link to this view" }));
    const field = await screen.findByRole("textbox", { name: "Link to this view" });
    expect((field as HTMLInputElement).value).toContain("#s=");
    expect(screen.queryByText(/Link copied/)).toBeNull();
  });

  it("does not claim success when the clipboard refuses", async () => {
    setClipboard({ writeText: () => Promise.reject(new Error("denied")) });
    render(<ModuleShell lesson={lessonFor()} module={valleyModule} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy a link to this view" }));
    expect(await screen.findByRole("textbox", { name: "Link to this view" })).toBeVisible();
    expect(screen.queryByText(/Link copied/)).toBeNull();
  });

  it("says Link copied only once written, and clears it on the next change", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setClipboard({ writeText });
    render(<ModuleShell lesson={lessonFor()} module={valleyModule} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy a link to this view" }));
    expect(await screen.findByText(/Link copied/, { selector: "[data-share] p" })).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("#s="));
    await turnDialTo("End");
    expect(screen.queryByText(/Link copied/, { selector: "[data-share] p" })).toBeNull();
    expect(window.location.hash).not.toContain("s=");
  });

  it("refuses a view too big for a link", async () => {
    setClipboard({ writeText: () => Promise.resolve() });
    // Random letters do not compress, so this state cannot fit in a link.
    const noise = Array.from({ length: 60_000 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90)),
    ).join("");
    const big: LessonModule = {
      ...valleyModule,
      initialState: { ...(valleyModule.initialState as Valley), noise } as ModuleState,
    };
    render(<ModuleShell lesson={lessonFor()} module={big} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy a link to this view" }));
    expect(
      await screen.findByText(/too big to fit in a link/, { selector: "[data-share] p" }),
    ).toBeVisible();
    expect(screen.queryByText(/Link copied/)).toBeNull();
  });
});
