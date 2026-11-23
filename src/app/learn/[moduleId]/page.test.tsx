import { render, screen, within } from "@testing-library/react";
import LearnPage from "./page";
import type * as World6 from "@/catalog/world-6";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("@/platform/SiteNav", () => ({ SiteNav: () => <nav aria-label="Around the atlas" /> }));
vi.mock("./LessonPage", () => ({ LessonPage: ({ id }: { id: string }) => <p>lesson {id}</p> }));
// Every lesson is built from stage 10 on, so no real page is locked any more. Here Treats and
// tricks is unbuilt again, so the locked page (once shown in e2e/platform.spec.ts) stays covered.
vi.mock("@/catalog/world-6", async (importOriginal) => {
  const { world6 } = await importOriginal<typeof World6>();
  return {
    world6: {
      ...world6,
      lessons: world6.lessons.map((lesson) =>
        lesson.id === "treats-and-tricks" ? { ...lesson, load: undefined } : lesson,
      ),
    },
  };
});

const open = async (moduleId: string) =>
  render(await LearnPage({ params: Promise.resolve({ moduleId }) }));

describe("a lesson page", () => {
  it("opens a built lesson", async () => {
    await open("rolling-downhill");
    expect(screen.getByText("lesson rolling-downhill")).toBeInTheDocument();
  });

  it("shows an unbuilt lesson's locked page: its idea, what to try first, never its real name", async () => {
    await open("treats-and-tricks");
    expect(screen.getByRole("heading", { level: 1, name: "Treats and tricks" })).toBeVisible();
    expect(screen.getByText("Still being drawn")).toBeVisible();
    expect(screen.getByText("Learn by trying things and getting rewards")).toBeVisible();
    expect(screen.queryByText("Reinforcement learning")).toBeNull();
    const first = screen.getByRole("navigation", { name: "Good to try first" });
    expect(within(first).getByRole("link", { name: "Teach by showing" })).toHaveAttribute(
      "href",
      "/learn/teach-by-showing",
    );
    // The first built lesson in curriculum order, for a learner who has mastered nothing.
    const ready = screen.getByRole("navigation", { name: "Ready to explore now" });
    expect(within(ready).getByRole("link")).toHaveAttribute("href", "/learn/teach-by-showing");
  });
});
