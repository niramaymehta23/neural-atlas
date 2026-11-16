import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./Toggle";

function Harness() {
  const [on, setOn] = useState(false);
  return <Toggle label="Let it forget a little" checked={on} onChange={setOn} />;
}

describe("Toggle", () => {
  it("flips with Space and Enter", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByRole("switch", { name: "Let it forget a little" });
    await user.tab();
    await user.keyboard(" ");
    expect(toggle).toBeChecked();
    await user.keyboard("{Enter}");
    expect(toggle).not.toBeChecked();
  });

  it("flips when its label is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Let it forget a little"));
    expect(screen.getByRole("switch")).toBeChecked();
  });
});
