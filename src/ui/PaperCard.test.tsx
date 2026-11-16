import { render, screen } from "@testing-library/react";
import { PaperCard } from "./PaperCard";

describe("PaperCard", () => {
  it("is flat at rest and casts the soft shadow only while lifted", () => {
    const { rerender } = render(<PaperCard data-testid="card">Hello</PaperCard>);
    expect(screen.getByTestId("card")).not.toHaveClass("shadow-lifted");
    rerender(
      <PaperCard data-testid="card" lifted>
        Hello
      </PaperCard>,
    );
    expect(screen.getByTestId("card")).toHaveClass("shadow-lifted");
    expect(screen.getByTestId("card")).toHaveTextContent("Hello");
  });
});
