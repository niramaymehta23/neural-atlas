import { render, screen } from "@testing-library/react";
import { Robot } from "./Robot";

describe("Robot", () => {
  it("is a named image drawn only with design colours", () => {
    render(<Robot />);
    const robot = screen.getByRole("img", { name: "Robot learner" });
    for (const shape of robot.querySelectorAll("path")) {
      expect(shape.getAttribute("fill") ?? "none").toMatch(/^none$/);
    }
  });
});
