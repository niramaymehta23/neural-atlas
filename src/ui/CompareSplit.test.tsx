import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompareSplit } from "./CompareSplit";

function renderSplit() {
  return render(
    <CompareSplit
      label="Compare steps"
      leftLabel="Small step"
      rightLabel="Big step"
      left={<p>left scene</p>}
      right={<p>right scene</p>}
    />,
  );
}

describe("CompareSplit", () => {
  it("moves the divider with the arrow keys, within its range", async () => {
    const user = userEvent.setup();
    renderSplit();
    const divider = screen.getByRole("separator", { name: "Compare steps" });
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    await user.tab();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(divider).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("left scene").parentElement?.style.clipPath).toBe("inset(0 60% 0 0)");
    await user.keyboard("{Home}");
    expect(divider).toHaveAttribute("aria-valuenow", "5");
    await user.keyboard("{End}");
    expect(divider).toHaveAttribute("aria-valuenow", "95");
  });

  it("labels both sides in plain words", () => {
    renderSplit();
    expect(screen.getByText("Small step")).toBeVisible();
    expect(screen.getByText("Big step")).toBeVisible();
  });
});
