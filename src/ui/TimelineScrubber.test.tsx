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

  it("reads the same moment it shows while the recording catches up", () => {
    const props = {
      playing: false,
      onPlayToggle: () => undefined,
      onSeek: () => undefined,
      losses: [],
      describe: (position: number, length: number) => `${position + 1}/${length}`,
    };
    const { rerender } = render(<TimelineScrubber {...props} length={50} position={70} />);
    const slider = screen.getByRole("slider", { name: "Moment" });
    expect(slider).toHaveAttribute("aria-valuenow", "49");
    expect(slider).toHaveAttribute("aria-valuetext", "50/50");
    rerender(<TimelineScrubber {...props} length={71} position={70} />);
    expect(slider).toHaveAttribute("aria-valuenow", "70");
    expect(slider).toHaveAttribute("aria-valuetext", "71/71");
  });

  it("offers a way back to now only while an earlier moment is shown", async () => {
    const user = userEvent.setup();
    const onLive = vi.fn();
    const props = {
      length: 5,
      position: 2,
      playing: false,
      onPlayToggle: () => undefined,
      onSeek: () => undefined,
      losses: LOSSES,
      onLive,
    };
    const { rerender } = render(<TimelineScrubber {...props} live />);
    expect(screen.queryByRole("button", { name: "Back to now" })).toBeNull();
    rerender(<TimelineScrubber {...props} live={false} />);
    await user.click(screen.getByRole("button", { name: "Back to now" }));
    expect(onLive).toHaveBeenCalledOnce();
  });
});
