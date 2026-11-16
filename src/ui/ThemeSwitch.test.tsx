import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSwitch } from "./ThemeSwitch";

describe("ThemeSwitch", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.clear();
  });

  it("starts on ivory day paper and switches to night", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);
    expect(screen.getByRole("radio", { name: "Day" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Night" }));
    expect(document.documentElement.dataset.theme).toBe("night");
    expect(await screen.findByRole("radio", { name: "Night", checked: true })).toBeVisible();
  });
});
