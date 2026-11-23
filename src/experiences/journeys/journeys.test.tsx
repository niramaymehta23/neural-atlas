import { act, fireEvent, render, screen } from "@testing-library/react";
import { lessonById } from "@/catalog";
import { progressStore } from "@/platform/progress/progress";
import { AUTO_MS, JourneyPage } from "./JourneyPage";
import { hashForStop, JOURNEYS, journeyById, journeys, stopFromHash } from "./journeys";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
// The lessons have their own tests; here only that the stop's lesson is the one put on stage.
vi.mock("../shell/LessonStage", () => ({
  preloadLesson: () => undefined,
  LessonStage: ({ id, onTouch }: { id: string; onTouch?: () => void }) => (
    <button type="button" data-lesson={id} onClick={onTouch}>
      {id}
    </button>
  ),
}));

const journey = journeys[0];
if (!journey) throw new Error("no journeys");
const stopNow = () => document.querySelector("[data-stop]")?.getAttribute("data-stop");
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next stop" }));

beforeEach(() => window.history.replaceState(null, "", `/journeys/${journey.id}`));
afterEach(() => vi.useRealTimers());

describe("the journeys", () => {
  it.each(journeys.map(({ id, stops }) => [id, stops] as const))(
    "%s stops only at lessons that exist and play, each once",
    (_, stops) => {
      expect(stops.length).toBeGreaterThan(4);
      expect(new Set(stops.map(({ lesson }) => lesson)).size).toBe(stops.length);
      for (const { lesson, words } of stops) {
        expect(lessonById(lesson)?.load, lesson).toBeTypeOf("function");
        expect(words.length).toBeGreaterThan(40);
      }
    },
  );

  it("include how ChatGPT works, from a question to an answer", () => {
    expect(journeyById("how-chatgpt-works")?.stops[0]?.lesson).toBe("chopping-text-into-pieces");
    expect(journeyById("nowhere")).toBeUndefined();
    expect(JOURNEYS).toContain("how-chatgpt-works");
  });

  it("clamp the stop in an address", () => {
    expect(stopFromHash("#stop=3", 10)).toBe(2);
    expect(stopFromHash("#stop=99", 10)).toBe(9);
    expect(stopFromHash("#stop=-5", 10)).toBe(0);
    expect(stopFromHash("#stop=soon", 10)).toBe(0);
    expect(stopFromHash("", 10)).toBe(0);
    expect(stopFromHash("#stop=2", 0)).toBe(0);
    expect(stopFromHash(hashForStop(4), 10)).toBe(4);
  });
});

describe("a journey's page", () => {
  it("walks forwards and back, keeping the stop in the address", () => {
    render(<JourneyPage journey={journey} />);
    expect(stopNow()).toBe("1");
    expect(screen.getByRole("button", { name: "Back a stop" })).toBeDisabled();
    next();
    expect(stopNow()).toBe("2");
    expect(window.location.hash).toBe("#stop=2");
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Stop two of 15");
    fireEvent.click(screen.getByRole("button", { name: "Back a stop" }));
    expect(stopNow()).toBe("1");
  });

  it("opens at the stop in the address, and keeps its star for those who walk there", () => {
    window.history.replaceState(null, "", "/journeys/x#stop=15");
    render(<JourneyPage journey={journey} />);
    expect(stopNow()).toBe("15");
    expect(screen.getByText("You’ve arrived")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Next stop" })).toBeNull();
    expect(progressStore.getState().achievements).not.toContain("journey");
  });

  it("plays every stop in order to the end, and gives the star there", async () => {
    render(<JourneyPage journey={journey} />);
    for (const { lesson } of journey.stops) {
      expect(document.querySelector("[data-lesson]")).toHaveAttribute("data-lesson", lesson);
      if (screen.queryByRole("button", { name: "Next stop" })) next();
    }
    await vi.waitFor(() => expect(progressStore.getState().achievements).toContain("journey"));
  });

  it("moves on by itself when asked, until something is touched", () => {
    vi.useFakeTimers();
    render(<JourneyPage journey={journey} />);
    fireEvent.click(screen.getByRole("switch", { name: "Move on by itself" }));
    act(() => void vi.advanceTimersByTime(AUTO_MS));
    expect(stopNow()).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: journey.stops[1]?.lesson }));
    act(() => void vi.advanceTimersByTime(AUTO_MS * 2));
    expect(stopNow()).toBe("2");
  });
});
