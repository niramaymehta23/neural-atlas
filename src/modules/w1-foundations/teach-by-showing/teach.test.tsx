import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { teachingFruit, type TeachState } from "./model";

const initial = definition.initialState as TeachState;
let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `teach-${(lessons += 1)}` }} module={definition} />,
  );

/** Sorts every shown fruit, into its own basket or the other one. */
async function sortAll(wrong: boolean) {
  for (const fruit of teachingFruit(initial)) {
    const basket = wrong ? 1 - fruit.kind : fruit.kind;
    await userEvent.click(screen.getByRole("button", { name: words.baskets[basket as 0 | 1] }));
  }
}

describe("teach by showing: in the lesson", () => {
  it("waits for every fruit to be sorted before the robot can try", async () => {
    renderLesson();
    expect(screen.getByRole("button", { name: words.letItTry })).toBeDisabled();
    await sortAll(false);
    expect(screen.getByText(words.doneSorting)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: words.letItTry }));
    await waitFor(() =>
      expect(document.querySelector("[data-robot-score]")).toHaveTextContent(/new fruit right/),
    );
  });

  it("earns the star when wrong labels teach the robot wrong", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await sortAll(true);
    await userEvent.click(screen.getByRole("button", { name: words.letItTry }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });

  it("hides the robot's old result once the baskets change", async () => {
    renderLesson();
    await sortAll(false);
    await userEvent.click(screen.getByRole("button", { name: words.letItTry }));
    await waitFor(() => expect(document.querySelector("[data-robot-score]")).not.toBeNull());
    await userEvent.click(screen.getByRole("button", { name: words.startOver }));
    expect(document.querySelector("[data-robot-score]")).toBeNull();
    expect(screen.getByText(words.robotWaiting)).toBeInTheDocument();
  });
});
