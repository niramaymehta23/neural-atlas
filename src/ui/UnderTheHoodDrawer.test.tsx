import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import { UnderTheHoodDrawer } from "./UnderTheHoodDrawer";

describe("UnderTheHoodDrawer", () => {
  it("starts closed and opens and closes from the keyboard", async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    render(<UnderTheHoodDrawer>How the ball rolls.</UnderTheHoodDrawer>);
    const trigger = screen.getByRole("button", { name: "Peek under the hood" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("How the ball rolls.")).not.toBeInTheDocument();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("How the ball rolls.")).toBeVisible();
    await user.keyboard(" ");
    expect(screen.queryByText("How the ball rolls.")).not.toBeInTheDocument();
  });

  it("opens at full height at once under reduced motion", async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    render(<UnderTheHoodDrawer>How the ball rolls.</UnderTheHoodDrawer>);
    await user.click(screen.getByRole("button", { name: "Peek under the hood" }));
    const panel = screen.getByText("How the ball rolls.").parentElement;
    expect(panel?.style.height).toBe("auto");
    expect(panel?.style.opacity).toBe("1");
  });
});
