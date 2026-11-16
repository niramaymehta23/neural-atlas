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
});
