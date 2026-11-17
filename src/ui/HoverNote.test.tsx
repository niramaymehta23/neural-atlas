import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HoverNote } from "./HoverNote";

describe("HoverNote", () => {
  it("shows its one sentence when the thing is focused from the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <HoverNote note="This dot is one tiny voter.">
        <button type="button">A neuron</button>
      </HoverNote>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("This dot is one tiny voter.");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows its note on a click and keeps the thing's own click working", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <HoverNote note="Takes the same size of step every time.">
        <button type="button" onClick={onClick}>
          Steady walker
        </button>
      </HoverNote>,
    );
    await user.click(screen.getByRole("button", { name: "Steady walker" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("same size of step");
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button")).toHaveAccessibleDescription(/same size of step/);
  });

  it("shows its note on a tap, where there is no hover", async () => {
    const user = userEvent.setup();
    render(
      <HoverNote note="Keeps some of its speed.">
        <button type="button">Rolling ball</button>
      </HoverNote>,
    );
    const button = screen.getByRole("button", { name: "Rolling ball" });
    await user.pointer({ target: button, keys: "[TouchA]", pointerName: "touch" });
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Keeps some of its speed.");
  });
});
