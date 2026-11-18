import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadWriters } from "@/engine/language/files";
import { readFilesFromDisk } from "@/engine/language/testing/disk-files";
import type { Writers } from "@/engine/language/writers";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { frameOf, type TruthFrame, type TruthState } from "./model";
import { predictions } from "./predictions";

readFilesFromDisk();
let writers: Writers;
beforeAll(async () => {
  writers = await loadWriters();
}, 10_000);

const initial = definition.initialState as TruthState;
const at = (change: Partial<TruthState>): TruthState => ({ ...initial, ...change }) as TruthState;
const shown = (state: TruthState): TruthFrame => ({ ...frameOf(writers, state), epoch: 1 });
const [mission] = missions;
const [guess] = predictions;

describe("confident but wrong: the storyteller", () => {
  it("answers what its books said, and cites the right book", () => {
    const frame = shown(at({ source: true }));
    expect(frame.answer).toBe("the fox eats eggs");
    expect(frame.truth).toBe("right");
    expect(frame.book).toBe("forest tales");
    expect(frame.real).toBe(true);
  });

  it("names a colour for the hen, sounding sure, though its book never says", () => {
    const frame = shown(at({ animal: "hen", kind: "colour" }));
    expect(frame.truth).toBe("unknown");
    expect(frame.madeUp).toBe(true);
    expect(frame.sure).toBeGreaterThan(0.8);
  });
});

describe("confident but wrong: mission and guess", () => {
  it("fires once it cites a book for the made-up colour", () => {
    const asked = at({ animal: "hen", kind: "colour", source: true });
    expect(mission.when(asked, shown(asked))).toBe(true);
    const unasked = at({ animal: "hen", kind: "colour" });
    expect(mission.when(unasked, shown(unasked))).toBe(false);
    expect(mission.when(at({ source: true }), shown(at({ source: true })))).toBe(false);
  });

  it("answers that it makes up a colour", () => {
    expect(guess.answer(initial, shown(initial))).toBeNull();
    expect(guess.answer(initial, shown(at({ animal: "hen", kind: "colour" })))).toBe("makeUp");
  });
});

describe("confident but wrong: links", () => {
  it("keeps a hand-made link to a real animal and question", () => {
    expect(
      definition.parseState!({ animal: "dragon", kind: "flies", source: true }, initial),
    ).toEqual({
      animal: "fox",
      kind: "eats",
      source: true,
    });
  });
});

describe("confident but wrong: in the lesson", () => {
  it("earns the star for a made-up source", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "confident-but-wrong-1" }} module={definition} />,
    );
    await waitFor(() => expect(document.querySelector("[data-answer]")).not.toBeNull(), {
      timeout: 10_000,
    });
    await userEvent.click(screen.getByRole("button", { name: "hen" }));
    await userEvent.click(screen.getByRole("radio", { name: words.kinds.colour }));
    await userEvent.click(screen.getByRole("button", { name: words.askSource }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(document.querySelector("[data-fake]")).not.toBeNull();
  }, 20_000);
});
