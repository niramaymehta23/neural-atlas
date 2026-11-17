import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";
import { PaletteTrigger } from "./PaletteTrigger";
import { setPaletteOpen } from "./palette-store";

const ITEMS = [
  { id: "neuron", label: "A tiny voter" },
  { id: "downhill", label: "Rolling downhill", hint: "Gradient descent" },
  {
    id: "teach",
    label: "Teach by showing",
    hint: "Machine learning",
    keywords: ["Sort fruit yourself; a little robot copies you"],
  },
  { id: "places", label: "Good places to be", keywords: ["Learning from scores"] },
  { id: "next-word", label: "Guess the next word", keywords: ["ChatGPT just keeps guessing"] },
];

function renderPalette() {
  const onSelect = vi.fn();
  render(
    <>
      <PaletteTrigger />
      <CommandPalette items={ITEMS} onSelect={onSelect} />
    </>,
  );
  return onSelect;
}

const shownOptions = () => screen.queryAllByRole("option").map((option) => option.textContent);

afterEach(() => act(() => setPaletteOpen(false)));

describe("CommandPalette", () => {
  it("opens with Ctrl+K, finds an idea by typing, and picks it with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = renderPalette();
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
    renderPalette();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says so kindly when nothing matches", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getByRole("button", { name: /Find an idea/ }));
    await user.keyboard("zebra");
    expect(screen.getByText("Nothing by that name yet.")).toBeVisible();
  });

  it("finds ideas by what you play with and by world words (NAV-03)", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getByRole("button", { name: /Find an idea/ }));
    await user.keyboard("sorting fruit");
    expect(shownOptions()).toEqual(["Teach by showing"]);
    await user.clear(screen.getByRole("combobox"));
    await user.keyboard("chatgpt");
    expect(shownOptions()).toEqual(["Guess the next word"]);
  });

  it("matches short queries only at the start of a word (NAV-03)", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getByRole("button", { name: /Find an idea/ }));
    await user.keyboard("gpt");
    expect(shownOptions()).toEqual([]);
  });

  it("keeps real terms off the rows unless the search found them (NAV-04)", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getByRole("button", { name: /Find an idea/ }));
    expect(screen.queryByText("Gradient descent")).not.toBeInTheDocument();
    await user.keyboard("gradient descent");
    expect(shownOptions()).toEqual(["Rolling downhillGradient descent"]);
  });
});
