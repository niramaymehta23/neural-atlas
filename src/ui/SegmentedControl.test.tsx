import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "round", label: "Round" },
  { value: "pointy", label: "Pointy" },
] as const;

function Harness() {
  const [value, setValue] = useState<"round" | "pointy">("round");
  return (
    <SegmentedControl label="Fruit shape" options={OPTIONS} value={value} onChange={setValue} />
  );
}

describe("SegmentedControl", () => {
  it("moves between choices with arrows and picks with Space", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Fruit shape" })).toBeVisible();
    await user.tab();
    expect(screen.getByRole("radio", { name: "Round" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Pointy" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Pointy" })).toHaveAttribute("aria-checked", "true");
  });

  it("always keeps one choice: picking the chosen one again does nothing", async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "Round" }));
    expect(screen.getByRole("radio", { name: "Round" })).toHaveAttribute("aria-checked", "true");
  });

  it("wraps a short row instead of overflowing a narrow dock", () => {
    render(<Harness />);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("data-layout", "row");
    expect(group).toHaveClass("flex-wrap", "max-w-full");
  });

  it("stacks more than three choices as a list that moves with up and down", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Which valley"
        showLabel
        options={["Bowl", "Ravine", "Pass", "Bumpy"].map((name) => ({ value: name, label: name }))}
        value="Bowl"
        onChange={onChange}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Which valley" });
    expect(group).toHaveAttribute("data-layout", "list");
    expect(screen.getByText("Which valley")).toBeVisible();
    await user.tab();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("Ravine");
  });
});
