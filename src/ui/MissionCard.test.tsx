import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MissionCard } from "./MissionCard";

describe("MissionCard", () => {
  it("keeps the hint hidden until asked for from the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <MissionCard goal="Make it forget everything" done={false} hint="Try a really big step." />,
    );
    expect(screen.getByRole("region", { name: "Mission" })).toHaveTextContent(
      "Make it forget everything",
    );
    expect(screen.queryByText("Try a really big step.")).not.toBeInTheDocument();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Try a really big step.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Hide the hint" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("says when it is done and drops the hint", () => {
    render(<MissionCard goal="Make it forget everything" done hint="Try a really big step." />);
    expect(screen.getByText("Mission done")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
