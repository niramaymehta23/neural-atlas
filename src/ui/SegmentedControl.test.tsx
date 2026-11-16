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
});
