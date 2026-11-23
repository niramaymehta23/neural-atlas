import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { lessons } from "@/catalog";
import type * as World6 from "@/catalog/world-6";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import { progressStore } from "@/platform/progress/progress";
import { storageHealth } from "@/platform/storage";
import { setPaletteOpen } from "@/ui/palette-store";
import type { ConstellationScene } from "./ConstellationScene";
import { HomeMap } from "./HomeMap";

/** Every lesson with a module, read from the catalog so a newly built lesson needs no edit here. */
const builtIds = lessons.filter(({ load }) => load).map(({ id }) => id);

const router = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn() }));
const scene = vi.hoisted(() => ({
  props: null as ComponentProps<typeof ConstellationScene> | null,
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
// WebGL is not in jsdom: a stand-in records what the map is asked to show.
vi.mock("./ConstellationScene", () => ({
  ConstellationScene: (props: ComponentProps<typeof ConstellationScene>) => {
    scene.props = props;
    return (
      <>
        <button onClick={() => props.onChoose("rolling-downhill")}>choose</button>
        <button onClick={() => props.onChoose("treats-and-tricks")}>choose locked</button>
        <button type="button" data-star="treats-and-tricks">
          star
        </button>
      </>
    );
  },
}));
vi.mock("@/platform/SiteNav", () => ({ SiteNav: () => <nav aria-label="Around the atlas" /> }));
// Every lesson is built from stage 10 on. Here Treats and tricks is unbuilt again, so the map's
// "still being drawn" paths (a locked star, the fade across) stay covered.
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

describe("HomeMap", () => {
  beforeEach(() => {
    router.push.mockClear();
    scene.props = null;
    window.history.replaceState(null, "", "/");
    storageHealth.setState({ persistent: true });
    setPaletteOpen(false);
  });

  it("shows all 74 ideas and suggests the first built lesson to a new learner", async () => {
    render(<HomeMap />);
    await screen.findByText("choose");
    expect(scene.props?.stars).toHaveLength(74);
    expect(scene.props?.suggested).toBe("teach-by-showing");
    expect(scene.props?.learned.size).toBe(0);
  });

  it("tells the map which ideas are built and which are still being drawn", async () => {
    render(<HomeMap />);
    await screen.findByText("choose");
    expect(scene.props?.built.has("rolling-downhill")).toBe(true);
    expect(scene.props?.built.has("treats-and-tricks")).toBe(false);
    expect(scene.props?.built.size).toBe(builtIds.length);
  });

  it("lists every idea as plain links before the map arrives", () => {
    render(<HomeMap />);
    const list = screen.getByRole("navigation", { name: "Every idea, group by group" });
    expect(list.querySelectorAll('a[href^="/learn/"]')).toHaveLength(74);
  });

  it("puts the heading and filter before the stars, after a skip link", async () => {
    render(<HomeMap />);
    await screen.findByText("choose");
    const skip = screen.getByRole("link", { name: "Skip to the map" });
    const filter = screen.getByRole("radio", { name: "All ideas" });
    const star = screen.getByText("star");
    expect(skip.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(filter.compareDocumentPosition(star) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(skip).toHaveAttribute("href", "#map");
  });

  it("narrows the map to one group with the filter bar, kept in the address", async () => {
    const user = userEvent.setup();
    render(<HomeMap />);
    await screen.findByText("choose");
    await user.click(screen.getByRole("radio", { name: "Learning by trying" }));
    expect(scene.props?.world).toBe(6);
    expect(window.location.search).toBe("?world=6");
    await user.click(screen.getByRole("radio", { name: "All ideas" }));
    expect(scene.props?.world).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("starts on the group named in the address (coming back from a lesson)", async () => {
    window.history.replaceState(null, "", "/?world=3");
    render(<HomeMap />);
    await screen.findByText("choose");
    expect(scene.props?.world).toBe(3);
    expect(screen.getByRole("radio", { name: "Brains made of numbers" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("hands focus to the filter when the filter hides the focused star", async () => {
    render(<HomeMap />);
    await screen.findByText("choose");
    screen.getByText("star").focus();
    // A click that does not move focus itself, like a shortcut would.
    fireEvent.click(screen.getByRole("radio", { name: "Brains made of numbers" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("radio", { name: "Brains made of numbers" }),
      ),
    );
  });

  it("flies to a built idea and fetches its lesson early, then opens it", async () => {
    const user = userEvent.setup();
    render(<HomeMap />);
    await user.click(await screen.findByText("choose"));
    expect(scene.props?.flyingTo).toBe("rolling-downhill");
    expect(screen.getByRole("main")).toHaveAttribute("data-leaving", "fly");
    expect(screen.getByRole("banner")).toHaveAttribute("inert");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/learn/rolling-downhill"), {
      timeout: 2000,
    });
  });

  it("fetches a lesson's code as soon as its star is pointed at", async () => {
    const catalog = await import("@/catalog");
    const lesson = catalog.lessonById("rolling-downhill")!;
    const load = vi.spyOn(lesson, "load");
    render(<HomeMap />);
    await screen.findByText("choose");
    act(() => scene.props?.onPoint("rolling-downhill"));
    expect(load).toHaveBeenCalled();
    load.mockRestore();
  });

  it("fades across, without flying, into an idea still being drawn", async () => {
    const user = userEvent.setup();
    render(<HomeMap />);
    await user.click(await screen.findByText("choose locked"));
    expect(scene.props?.flyingTo).toBeNull();
    expect(screen.getByRole("main")).toHaveAttribute("data-leaving", "fade");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/learn/treats-and-tricks"));
  });

  it("lets the palette take over a flight that has started", async () => {
    const user = userEvent.setup();
    render(<HomeMap />);
    await user.click(await screen.findByText("choose"));
    act(() => setPaletteOpen(true));
    expect(scene.props?.flyingTo).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("fades across without moving the camera under reduced motion", async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    render(<HomeMap />);
    await user.click(await screen.findByText("choose"));
    expect(scene.props?.flyingTo).toBeNull();
    expect(screen.getByRole("main")).toHaveAttribute("data-leaving", "fade");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/learn/rolling-downhill"));
  });

  it("suggests nothing, and says more is coming, once every built idea is learned", async () => {
    const done = { visited: true, missions: ["m"], predicted: true };
    const built = builtIds;
    render(<HomeMap />);
    await screen.findByText("choose");
    act(() =>
      progressStore.setState({ lessons: Object.fromEntries(built.map((id) => [id, done])) }),
    );
    expect(scene.props?.suggested).toBeNull();
    expect(scene.props?.learned.size).toBe(built.length);
    expect(screen.getByText(/More ideas are being drawn/)).toBeInTheDocument();
    act(() => progressStore.setState({ lessons: {} }));
  });

  it("says so when this browser cannot keep progress", async () => {
    render(<HomeMap />);
    expect(screen.queryByText("This browser won’t remember your progress.")).toBeNull();
    act(() => storageHealth.setState({ persistent: false }));
    expect(screen.getByText("This browser won’t remember your progress.")).toBeInTheDocument();
  });
});
