import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dial } from "./Dial";

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
});
