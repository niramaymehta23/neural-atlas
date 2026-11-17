import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonErrorBoundary } from "./LessonErrorBoundary";

let shouldThrow = true;
function Fragile() {
  if (shouldThrow) throw new Error("scene broke");
  return <p>scene</p>;
}

describe("LessonErrorBoundary (PLT-04)", () => {
  it("shows a plain caption and mounts the part afresh on Try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    shouldThrow = true;
    render(
      <LessonErrorBoundary>
        <Fragile />
      </LessonErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong here.");
    shouldThrow = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("scene")).toBeVisible();
  });
});
