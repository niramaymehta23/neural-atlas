import { render, screen } from "@testing-library/react";
import { TermTag } from "./TermTag";

describe("TermTag", () => {
  it("names the real term after the plain lead", () => {
    render(<TermTag term="gradient descent" />);
    expect(screen.getByText("gradient descent").tagName).toBe("EM");
    expect(screen.getByText(/You just did/)).toHaveTextContent("You just did gradient descent");
  });
});
