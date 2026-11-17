import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Blob as NodeBlob } from "node:buffer";
import { companionStore } from "./companion/companion";
import { valleyLesson, valleyModule } from "./fixture/fixture-module";
import type { Lesson, LessonModule } from "./contract";
import { LessonView } from "./LessonView";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("LessonView", () => {
  it("offers to try again when the lesson fails to load, then loads it (PLT-04)", async () => {
    const load = vi
      .fn<() => Promise<LessonModule>>()
      .mockRejectedValueOnce(new Error("chunk failed"))
      .mockResolvedValue(valleyModule);
    render(<LessonView lesson={{ ...valleyLesson, load }} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load/);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "A ball in a valley" })).toBeVisible();
  });

  it("says why a broken link was ignored (PLT-13)", async () => {
    vi.stubGlobal("Blob", NodeBlob);
    window.history.replaceState(null, "", "/#s=garbage");
    render(<LessonView lesson={valleyLesson} />);
    expect(await screen.findByText(/That link looks damaged/)).toHaveAttribute("role", "status");
  });

  it("starts from the learner's own network when the lesson asks (PLT-22)", async () => {
    await companionStore.update({ hidden: [4, 4, 4] });
    const own: LessonModule = {
      ...valleyModule,
      initialFrom: (companion, initial) => ({ ...initial, step: companion.hidden.length / 10 }),
    };
    const lesson: Lesson = { ...valleyLesson, load: async () => own };
    render(<LessonView lesson={lesson} />);
    const dial = await screen.findByRole("slider", { name: "How big a step" });
    expect(dial).toHaveAttribute("aria-valuenow", "0.3");
    await companionStore.reset();
  });
});
