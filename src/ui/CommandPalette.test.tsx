import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";

const ITEMS = [
  { id: "neuron", label: "A tiny voter" },
  { id: "downhill", label: "Rolling downhill", hint: "learning step by step" },
];

describe("CommandPalette", () => {
  it("opens with Ctrl+K, finds an idea by typing, and picks it with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CommandPalette items={ITEMS} onSelect={onSelect} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Find an idea" });
    expect(screen.getByRole("combobox")).toHaveFocus();
    await user.keyboard("downhill");
    expect(screen.queryByText("A tiny voter")).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("downhill");
    expect(dialog).not.toBeInTheDocument();
  });

  it("opens with Cmd+K and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={ITEMS} onSelect={() => undefined} />);
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says so kindly when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={ITEMS} onSelect={() => undefined} />);
    await user.click(screen.getByRole("button", { name: /Find an idea/ }));
    await user.keyboard("zebra");
    expect(screen.getByText("Nothing by that name yet.")).toBeVisible();
  });
});
