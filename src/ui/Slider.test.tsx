import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Slider } from "./Slider";

function Harness() {
  const [value, setValue] = useState(3);
  return (
    <Slider
      label="How many examples"
      value={value}
      onChange={setValue}
      min={0}
      max={10}
      step={1}
      describe={(v) => `${v} examples`}
    />
  );
}

describe("Slider", () => {
  it("moves with the arrow keys and reads its value in words", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "How many examples" });
    await user.tab();
    expect(slider).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuetext", "5 examples");
    expect(screen.getByText("5 examples")).toBeVisible();
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "10");
  });
});
