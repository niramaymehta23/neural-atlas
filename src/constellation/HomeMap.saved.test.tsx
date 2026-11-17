import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { Progress } from "@/platform/progress/progress";
import type * as ProgressModule from "@/platform/progress/progress";
import type { ConstellationScene } from "./ConstellationScene";
import { HomeMap } from "./HomeMap";

const seen = vi.hoisted(() => ({ suggested: [] as (string | null)[] }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("@/platform/SiteNav", () => ({ SiteNav: () => null }));
vi.mock("./ConstellationScene", () => ({
  ConstellationScene: (props: ComponentProps<typeof ConstellationScene>) => {
    seen.suggested.push(props.suggested);
    return <p>map</p>;
  },
}));
// A returning learner whose saved progress (Rolling downhill learned) takes a moment to read.
vi.mock("@/platform/progress/progress", async (importOriginal) => {
  const actual = await importOriginal<typeof ProgressModule>();
  const { useStore } = await import("zustand");
  const saved = {
    lessons: { "rolling-downhill": { visited: true, missions: ["m"], predicted: true } },
  };
  const progressStore = actual.createProgressStore({
    read: () => new Promise((resolve) => setTimeout(() => resolve(saved), 120)),
    write: async () => undefined,
  });
  return {
    ...actual,
    progressStore,
    useProgress: <T,>(select: (progress: Progress) => T) => useStore(progressStore, select),
  };
});

describe("HomeMap for a returning learner", () => {
  it("holds the map until saved progress is read, so the first suggestion is already right", async () => {
    render(<HomeMap />);
    await screen.findByText("map");
    expect(seen.suggested[0]).not.toBe("rolling-downhill");
    expect(seen.suggested[0]).toBe("stacking-cells");
  });
});
