import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { moveWord } from "./model";
import { ThreadView } from "./threads";

function Harness() {
  const [words, setWords] = useState(["the", "dog", "ran"]);
  const [focus, setFocus] = useState(1);
  const looks = words.map(() => words.map(() => 1 / words.length));
  return (
    <ThreadView
      threads={{ words, looks }}
      focus={focus}
      onFocus={setFocus}
      onMove={(from, to) => {
        setWords(moveWord(words, from, to).split(" "));
        setFocus(to);
      }}
    />
  );
}

describe("ThreadView", () => {
  it("moves the chosen word with buttons beside it, no dragging needed", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const wordsNow = () =>
      [...container.querySelectorAll("[data-word]")].map((chip) => chip.getAttribute("data-word"));
    await user.click(screen.getByRole("button", { name: "Move “dog” left" }));
    expect(wordsNow()).toEqual(["dog", "the", "ran"]);
    expect(screen.getByRole("button", { name: "Move “dog” left" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Move “dog” right" }));
    await user.click(screen.getByRole("button", { name: "Move “dog” right" }));
    expect(wordsNow()).toEqual(["the", "ran", "dog"]);
  });

  it("names its keyboard shortcut on every word", () => {
    const { container } = render(<Harness />);
    for (const chip of container.querySelectorAll("[data-word]"))
      expect(chip).toHaveAttribute("aria-keyshortcuts", "Alt+ArrowLeft Alt+ArrowRight");
  });
});
