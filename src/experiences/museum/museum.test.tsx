import { fireEvent, render, screen, within } from "@testing-library/react";
import { lessonById } from "@/catalog";
import { progressStore } from "@/platform/progress/progress";
import { practiseLabInProcess } from "@/engine/lab/testing/in-process-lab";
import { MuseumPage, ROOMS_FOR_STAR } from "./MuseumPage";
import { PairExhibit } from "./PairExhibit";
import { roomFromHash, rooms } from "./rooms";

practiseLabInProcess();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("../shell/LessonStage", () => ({
  LessonStage: ({ id }: { id: string }) => <p data-lesson={id}>{id}</p>,
}));
Element.prototype.scrollIntoView = vi.fn();

const WAIT = { timeout: 10_000 };
const LIMIT = 30_000;
beforeEach(() => window.history.replaceState(null, "", "/museum"));

describe("the rooms", () => {
  it("run from 1958 onwards, oldest first", () => {
    const years = rooms.map(({ year }) => year);
    expect(years[0]).toBe(1958);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(years.at(-1)).toBeGreaterThanOrEqual(2022);
    expect(new Set(rooms.map(({ id }) => id)).size).toBe(rooms.length);
  });

  it("all have something to play with that exists", () => {
    for (const { exhibit, id } of rooms)
      if (exhibit.kind === "lesson")
        expect(lessonById(exhibit.lesson)?.load, id).toBeTypeOf("function");
  });

  it("take the room from the address only if there is one", () => {
    expect(roomFromHash("#room=go")).toBe("go");
    expect(roomFromHash("#room=attic")).toBeNull();
    expect(roomFromHash("")).toBeNull();
  });
});

describe("the museum page", () => {
  it("has one exhibit out at a time", () => {
    render(<MuseumPage />);
    const room = (id: string) =>
      within(document.querySelector(`[data-room="${id}"]`) as HTMLElement);
    expect(document.querySelector("[data-lesson]")).toBeNull();
    fireEvent.click(room("perceptron").getByRole("button"));
    expect(room("perceptron").getByRole("button")).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(room("attention").getByRole("button"));
    expect(document.querySelectorAll("[data-lesson]")).toHaveLength(1);
    expect(room("perceptron").getByRole("button")).toHaveAttribute("aria-expanded", "false");
    // The real term waits until the exhibit has been tried.
    expect(room("go").queryByText("AlphaGo")).toBeNull();
    expect(room("attention").getByText(/the Transformer/)).toBeVisible();
  });

  it("gives a star for trying enough rooms, not for trying one room often", async () => {
    render(<MuseumPage />);
    const buttons = screen.getAllByRole("button", { name: /^Try it here/ });
    const first = buttons[0] as HTMLElement;
    for (let tap = 0; tap < ROOMS_FOR_STAR * 2; tap += 1) fireEvent.click(first);
    await progressStore.ready;
    expect(progressStore.getState().achievements).not.toContain("museum");
    for (const button of buttons.slice(0, ROOMS_FOR_STAR)) fireEvent.click(button);
    await vi.waitFor(() => expect(progressStore.getState().achievements).toContain("museum"));
  });
});

describe("a learner in a garden", () => {
  it(
    "shows what one fence makes of four corners, and what a team makes of them",
    async () => {
      render(<PairExhibit garden="xor" model="line" />);
      const start = () => screen.getByRole("button", { name: "Start practising" });
      fireEvent.click(start());
      await screen.findByRole("button", { name: "Practise again" }, WAIT);
      const put = () => Number(/puts (\S+) out of/.exec(document.body.textContent ?? "")?.[1]);
      const fence = put();
      fireEvent.click(screen.getByRole("radio", { name: "A big team" }));
      fireEvent.click(start());
      await screen.findByRole("button", { name: "Practise again" }, WAIT);
      expect(document.body.textContent).toMatch(/out of 100 new dots in the right group/);
      expect(fence).not.toBe(put());
    },
    LIMIT,
  );
});
