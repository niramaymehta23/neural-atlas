import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LossLandscape } from "./LossLandscape";

const bowl = (x: number, z: number) => x * x + z * z;
const WORDS = {
  label: "Choose where to drop the walkers",
  instructions: "Arrows move; Enter drops.",
};

describe("LossLandscape", () => {
  // jsdom has no WebGL, like an old or locked-down device: the still map stands in.
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("shows the valley from above, walkers told apart by shape, when 3D cannot be drawn", () => {
    const { container } = render(
      <LossLandscape
        height={bowl}
        label="A valley of mistakes"
        markers={[
          { x: 0.5, z: 0.5, shape: "circle" },
          { x: -0.5, z: 0.5, shape: "triangle" },
        ]}
        trails={[
          {
            points: [
              { x: 0, z: 0 },
              { x: 0.5, z: 0.5 },
            ],
            tone: "var(--color-ink)",
            dash: [0.05, 0.03],
          },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "A valley of mistakes" })).toHaveAttribute(
      "data-valley-map",
    );
    const shapes = [...container.querySelectorAll("[data-marker]")].map((marker) =>
      marker.getAttribute("data-marker"),
    );
    expect(shapes).toEqual(["circle", "triangle"]);
    expect(container.querySelector("polyline")).toHaveAttribute("stroke-dasharray", "10 6");
  });

  it("drops the walkers from the keyboard: tab to it, arrows move the ring, Enter drops", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const { container } = render(
      <LossLandscape height={bowl} label="A valley" onPick={onPick} pickWords={WORDS} />,
    );
    const control = screen.getByRole("application", { name: WORDS.label });
    expect(control).toHaveAccessibleDescription(WORDS.instructions);
    await user.tab();
    expect(control).toHaveFocus();
    expect(container.querySelector("[data-drop-spot]")).not.toBeNull();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowUp}{Enter}");
    expect(onPick).toHaveBeenCalledWith({ x: 0.2, z: -0.1 });
  });
});
