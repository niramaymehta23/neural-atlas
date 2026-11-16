import { render, screen } from "@testing-library/react";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import { StoryCaption } from "./StoryCaption";

const LINE = "You nudged it, and the whole line leaned with it.";

describe("StoryCaption", () => {
  it("stays hidden until the first interaction, then is announced politely", () => {
    const { rerender } = render(<StoryCaption shown={false}>{LINE}</StoryCaption>);
    expect(screen.queryByText(LINE)).not.toBeInTheDocument();
    rerender(<StoryCaption shown>{LINE}</StoryCaption>);
    expect(screen.getByText(LINE).parentElement).toHaveAttribute("aria-live", "polite");
  });

  it("settles in from below normally", () => {
    const { rerender } = render(<StoryCaption shown={false}>{LINE}</StoryCaption>);
    rerender(<StoryCaption shown>{LINE}</StoryCaption>);
    expect(screen.getByText(LINE).style.opacity).toBe("0");
  });

  it("appears at once, without movement, under reduced motion", () => {
    mockReducedMotion(true);
    const { rerender } = render(<StoryCaption shown={false}>{LINE}</StoryCaption>);
    rerender(<StoryCaption shown>{LINE}</StoryCaption>);
    const caption = screen.getByText(LINE);
    expect(caption.style.opacity).toBe("1");
    expect(caption.style.transform).toBe("none");
  });
});
