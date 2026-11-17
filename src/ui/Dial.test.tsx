import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dial, fractionAt } from "./Dial";

function Harness() {
  const [value, setValue] = useState(0.5);
  return (
    <Dial
      label="How big a step"
      value={value}
      onChange={setValue}
      step={0.1}
      describe={(v) => `${Math.round(v * 10)} tenths`}
    />
  );
}

describe("Dial", () => {
  it("turns with the arrow keys and stops at its ends", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const dial = screen.getByRole("slider", { name: "How big a step" });
    await user.tab();
    expect(dial).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(dial).toHaveAttribute("aria-valuetext", "7 tenths");
    await user.keyboard("{ArrowDown}");
    expect(dial).toHaveAttribute("aria-valuetext", "6 tenths");
    await user.keyboard("{End}{ArrowUp}");
    expect(dial).toHaveAttribute("aria-valuenow", "1");
    await user.keyboard("{Home}");
    expect(dial).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows its plain name and the value in words", () => {
    render(<Harness />);
    expect(screen.getByText("How big a step")).toBeVisible();
    expect(screen.getByText("5 tenths")).toBeVisible();
  });

  it("takes its value from where the arc is tapped, without dragging", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const dial = screen.getByRole("slider", { name: "How big a step" });
    dial.getBoundingClientRect = () => ({ left: 0, top: 0, width: 80, height: 80 }) as DOMRect;
    // Straight up is the middle of the sweep; 3 o'clock is five-sixths of the way round.
    await user.pointer({ target: dial, coords: { clientX: 78, clientY: 40 }, keys: "[MouseLeft]" });
    expect(dial).toHaveAttribute("aria-valuenow", "0.8");
    await user.pointer({ target: dial, coords: { clientX: 2, clientY: 40 }, keys: "[MouseLeft]" });
    expect(dial).toHaveAttribute("aria-valuenow", "0.2");
  });

  it("reads the arc from the start of the sweep and ignores presses on the knob", () => {
    expect(fractionAt(-30, 30, 40)).toBeCloseTo(0);
    expect(fractionAt(0, -40, 40)).toBeCloseTo(0.5);
    expect(fractionAt(30, 30, 40)).toBeCloseTo(1);
    expect(fractionAt(-1, 40, 40)).toBe(0);
    expect(fractionAt(5, 5, 40)).toBeNull();
  });
});
