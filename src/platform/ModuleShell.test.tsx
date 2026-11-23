import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson, valleyModule } from "./fixture/fixture-module";
import type { LessonModule, ModuleViewProps } from "./contract";
import { ModuleShell } from "./ModuleShell";
import { progressStore } from "./progress/progress";

const story = "Small steps settle the ball at the bottom; big ones overshoot.";

function renderShell(lessonId: string) {
  return render(<ModuleShell lesson={{ ...valleyLesson, id: lessonId }} module={valleyModule} />);
}

async function turnDialTo(value: "End" | "Home") {
  const dial = screen.getByRole("slider", { name: "How big a step" });
  dial.focus();
  await userEvent.keyboard(`{${value}}`);
}

describe("ModuleShell", () => {
  it("opens on the story with the scene, dials, mission, guess, timeline and a closed drawer", () => {
    renderShell("shell-opening");
    expect(screen.getByRole("heading", { name: "A ball in a valley" })).toBeVisible();
    expect(screen.getByText(/A ball sits on the side of a valley/)).toBeVisible();
    expect(screen.getByRole("region", { name: "The scene" })).toBeVisible();
    expect(
      within(screen.getByRole("complementary", { name: "Dials" })).getByRole("slider"),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Mission" })).toHaveTextContent(
      "Take steps so big the ball flies off",
    );
    expect(screen.getByRole("region", { name: "Make a guess" })).toBeVisible();
    expect(screen.getByRole("slider", { name: "Moment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Peek under the hood" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("switch", { name: "Compare side by side" })).toBeVisible();
  });

  it("shows the caption only after the first touch", async () => {
    renderShell("shell-caption");
    expect(screen.queryByText(story)).toBeNull();
    await turnDialTo("Home");
    expect(screen.getByText(story)).toBeInTheDocument();
  });

  it("names the real term only once the mission is done, and awards a star once", async () => {
    renderShell("shell-mission");
    expect(screen.queryByText("gradient descent")).toBeNull();
    await turnDialTo("End");
    const step = screen.getByRole("button", { name: "Take a step" });
    await userEvent.click(step);
    await userEvent.click(step);
    expect(screen.getByText("gradient descent")).toBeVisible();
    expect(screen.getByText("Mission done")).toBeVisible();
    expect(screen.getByText("You earned a star.")).toBeVisible();
    await userEvent.click(step);
    await act(() => progressStore.change((progress) => progress));
    expect(progressStore.getState().lessons["shell-mission"]?.missions).toEqual(["fly-off"]);
  });

  it("locks a guess in before revealing what happened, then shows both", async () => {
    renderShell("shell-guess");
    await userEvent.click(screen.getByRole("button", { name: "At the bottom" }));
    expect(screen.getByRole("button", { name: "Play a little more, then look." })).toBeDisabled();
    await turnDialTo("End");
    for (let i = 0; i < 3; i += 1) {
      await userEvent.click(screen.getByRole("button", { name: "Take a step" }));
    }
    await userEvent.click(screen.getByRole("button", { name: "Show me what happens" }));
    expect(screen.getByText("You guessed: At the bottom")).toBeVisible();
    expect(screen.getByText("What happened: Flying off")).toBeVisible();
    // The result is what happened at the reveal, not what the dial says now.
    await turnDialTo("Home");
    expect(screen.getByText("What happened: Flying off")).toBeVisible();
    await act(() => progressStore.change((progress) => progress));
    expect(progressStore.getState().lessons["shell-guess"]?.predicted).toBe(true);
  });

  it("restores a snapshot's view and moment, showing its guess as theirs (PLT-08, PLT-10)", () => {
    render(
      <ModuleShell
        lesson={valleyLesson}
        module={valleyModule}
        restored={{
          v: 2,
          id: valleyLesson.id,
          state: { step: 0.3, steps: 4 },
          touched: true,
          guesses: { "huge-steps": { choice: "settles", revealed: false } },
          momentEpoch: 2,
        }}
      />,
    );
    expect(screen.getByRole("slider", { name: "How big a step" })).toHaveAttribute(
      "aria-valuenow",
      "0.3",
    );
    expect(screen.getByText(story)).toBeInTheDocument();
    expect(screen.getByText("Their guess: At the bottom")).toBeVisible();
    expect(screen.getByRole("button", { name: "At the bottom" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("slider", { name: "Moment" })).toHaveAttribute("aria-valuenow", "2");
  });

  it("shows each mission's result and each guess's reveal before moving on", async () => {
    const [flyOff] = valleyModule.missions;
    const [huge] = valleyModule.predictions;
    const twoOfEach: LessonModule = {
      ...valleyModule,
      missions: [
        flyOff,
        {
          ...flyOff,
          id: "crawl",
          goal: "Make it crawl",
          success: "Tiny steps.",
          when: () => false,
        },
      ],
      predictions: [huge, { ...huge, id: "small-steps", question: "And with small steps?" }],
    };
    render(<ModuleShell lesson={{ ...valleyLesson, id: "shell-two" }} module={twoOfEach} />);

    await turnDialTo("End");
    await userEvent.click(screen.getByRole("button", { name: "Flying off" }));
    for (let i = 0; i < 3; i += 1) {
      await userEvent.click(screen.getByRole("button", { name: "Take a step" }));
    }
    expect(screen.getByText(flyOff.success)).toBeVisible();
    expect(screen.getByRole("button", { name: "Watch why it happened" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "On to the next mission" }));
    expect(screen.getByText("Make it crawl")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Show me what happens" }));
    expect(screen.getByText("You guessed: Flying off")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "On to the next guess" }));
    expect(screen.getByText("And with small steps?")).toBeVisible();
  });

  it("gives the compare split's right half its own timeline and no way to change state", async () => {
    const seen: ModuleViewProps<{ step: number; steps: number }>[] = [];
    const Spy = (props: ModuleViewProps<{ step: number; steps: number }>) => {
      seen.push(props);
      return null;
    };
    const spying: LessonModule = { ...valleyModule, scene: Spy as LessonModule["scene"] };
    render(<ModuleShell lesson={valleyLesson} module={spying} />);
    await userEvent.click(screen.getByRole("switch", { name: "Compare side by side" }));
    const main = seen.findLast(({ side }) => side === "main");
    const alternative = seen.findLast(({ side }) => side === "alternative");
    expect(alternative?.state.step).toBe(0.2);
    expect(alternative?.timeline).not.toBe(main?.timeline);
    alternative?.update({ step: 0.9 });
    expect(
      screen.getByRole("slider", { name: "How big a step" }).getAttribute("aria-valuenow"),
    ).toBe("0.2");
  });

  it("keeps a compare half with no frame at the shown moment still (no endless re-sync)", async () => {
    const seen: ModuleViewProps<{ step: number; steps: number }>[] = [];
    const Spy = (props: ModuleViewProps<{ step: number; steps: number }>) => {
      seen.push(props);
      return null;
    };
    const spying: LessonModule = { ...valleyModule, scene: Spy as LessonModule["scene"] };
    render(<ModuleShell lesson={{ ...valleyLesson, id: "shell-empty-compare" }} module={spying} />);
    const main = seen.findLast(({ side }) => side === "main");
    act(() => {
      for (const epoch of [0, 10, 20]) main?.timeline.record({ epoch, loss: 1 });
      main?.timeline.seek(1);
    });
    // The right half has recorded nothing yet: scrubbing it finds no frame at epoch 10.
    await userEvent.click(screen.getByRole("switch", { name: "Compare side by side" }));
    const alternative = seen.findLast(({ side }) => side === "alternative");
    expect(alternative?.timeline.current()).toBeUndefined();
    act(() => main?.timeline.seek(2));
    expect(main?.timeline.current()?.epoch).toBe(20);
  });

  it("plays both timelines at the lesson's own pace when it sets one, 30 a second otherwise", async () => {
    const paces: number[] = [];
    const Spy = (props: ModuleViewProps<{ step: number; steps: number }>) => {
      paces.push(props.timeline.framesPerSecond);
      return null;
    };
    const scene = Spy as LessonModule["scene"];
    const { unmount } = render(
      <ModuleShell lesson={valleyLesson} module={{ ...valleyModule, scene }} />,
    );
    expect(paces.at(-1)).toBe(30);
    unmount();
    paces.length = 0;
    render(
      <ModuleShell lesson={valleyLesson} module={{ ...valleyModule, scene, framesPerSecond: 6 }} />,
    );
    await userEvent.click(screen.getByRole("switch", { name: "Compare side by side" }));
    expect(new Set(paces)).toEqual(new Set([6]));
  });
});
