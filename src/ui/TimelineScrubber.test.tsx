import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineScrubber } from "./TimelineScrubber";

const LOSSES = [0.9, 0.7, 0.5, 0.4, 0.3];

function Harness({ length = LOSSES.length }: { length?: number }) {
  const [position, setPosition] = useState(length - 1);
  const [playing, setPlaying] = useState(false);
  return (
    <TimelineScrubber
      length={length}
      position={position}
      playing={playing}
      onPlayToggle={() => setPlaying((value) => !value)}
      onSeek={setPosition}
      losses={LOSSES.slice(0, length)}
      ghostLosses={[1, 0.9, 0.8]}
    />
  );
}

describe("TimelineScrubber", () => {
  it("scrubs from the keyboard and reads the moment in words", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Moment" });
    expect(slider).toHaveAttribute("aria-valuetext", "Moment five of five");
    slider.focus();
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuetext", "Moment one of five");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "2");
  });

  it("steps one moment at a time and stops at the ends", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const forward = screen.getByRole("button", { name: "Forward one moment" });
    expect(forward).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Back one moment" }));
    expect(screen.getByRole("slider", { name: "Moment" })).toHaveAttribute("aria-valuenow", "3");
    expect(forward).toBeEnabled();
  });

  it("toggles play and pause", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
  });

  it("paints the run and its ghost on one scale", () => {
    const { container } = render(<Harness />);
    const current = container.querySelector('[data-line="current"]')?.getAttribute("d") ?? "";
    const ghost = container.querySelector('[data-line="ghost"]')?.getAttribute("d") ?? "";
    expect(current.split(" L")).toHaveLength(5);
    expect(ghost.split(" L")).toHaveLength(3);
    expect(ghost.startsWith("M0.00 0.00")).toBe(true); // the ghost's worst moment is the top
  });

  it("waits quietly before anything is recorded", () => {
    render(<Harness length={0} />);
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Moment" })).toHaveAttribute(
      "aria-valuetext",
      "Nothing recorded yet",
    );
  });
});
