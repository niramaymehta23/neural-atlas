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

  it("keeps the right half out of reach: it is only a picture over the left", () => {
    const { container } = render(
      <CompareSplit
        label="Compare steps"
        leftLabel="Small step"
        rightLabel="Big step"
        left={<button type="button">left start</button>}
        right={<button type="button">right start</button>}
      />,
    );
    const right = container.querySelector('[data-pane="right"]');
    expect(right).toHaveAttribute("aria-hidden", "true");
    expect(right).toHaveAttribute("inert");
    expect(right).toHaveClass("absolute", "inset-0");
    expect(screen.getByText("left start").parentElement).not.toHaveClass("absolute");
    expect(screen.queryByRole("button", { name: "right start" })).toBeNull();
  });

  it("says in words how much shows each side, with the focus ring on the knob", () => {
    renderSplit();
    const divider = screen.getByRole("separator");
    expect(divider).toHaveAttribute("aria-valuetext", "50 percent shows Small step");
    expect(divider).toHaveClass("outline-none");
    expect(divider.querySelector("[data-knob]")).toHaveClass("group-focus-visible:outline-2");
  });
});
