import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import type { ConstellationScene } from "./ConstellationScene";
import { HomeMap } from "./HomeMap";

const router = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn() }));
const scene = vi.hoisted(() => ({
  props: null as ComponentProps<typeof ConstellationScene> | null,
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
// WebGL is not in jsdom: a stand-in records what the map is asked to show.
vi.mock("./ConstellationScene", () => ({
  ConstellationScene: (props: ComponentProps<typeof ConstellationScene>) => {
    scene.props = props;
    return <button onClick={() => props.onChoose("rolling-downhill")}>choose</button>;
  },
}));

describe("HomeMap", () => {
  beforeEach(() => {
    router.push.mockClear();
    scene.props = null;
  });

  it("shows all 74 ideas and suggests the first built lesson to a new learner", async () => {
    render(<HomeMap />);
    await screen.findByText("choose");
    expect(scene.props?.stars).toHaveLength(74);
    expect(scene.props?.suggested).toBe("rolling-downhill");
    expect(scene.props?.learned.size).toBe(0);
  });

  it("narrows the map to one group with the filter bar", async () => {
    const user = userEvent.setup();
    render(<HomeMap />);
    await screen.findByText("choose");
    await user.click(screen.getByRole("radio", { name: "Learning by trying" }));
    expect(scene.props?.world).toBe(6);
    await user.click(screen.getByRole("radio", { name: "All ideas" }));
    expect(scene.props?.world).toBeNull();
  });

  it("flies to the chosen idea, then opens its lesson", async () => {
    const user = userEvent.setup();
    render(<HomeMap />);
    await user.click(await screen.findByText("choose"));
    expect(scene.props?.flyingTo).toBe("rolling-downhill");
    expect(screen.getByRole("main")).toHaveAttribute("data-leaving", "fly");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/learn/rolling-downhill"), {
      timeout: 2000,
    });
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
});
