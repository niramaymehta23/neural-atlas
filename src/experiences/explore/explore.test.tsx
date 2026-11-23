import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { lessons } from "@/catalog";
import { progressStore } from "@/platform/progress/progress";
import { IdeaCardScope } from "@/ui/glossary/idea-cards";
import { achievements } from "../achievements/achievements";
import { ExplorePage } from "./ExplorePage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/explore",
}));

describe("the page of everything else to do", () => {
  it("leads to every experience and the puzzle", () => {
    render(<ExplorePage />);
    const things = within(screen.getByRole("list", { name: "Things to do" }));
    expect(things.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/sandbox",
      "/journeys",
      "/museum",
      "/theatre",
      "/two-player",
      "/puzzle",
    ]);
  });

  it("opens the card of any idea", async () => {
    const open = vi.fn();
    const { container } = render(
      <IdeaCardScope open={open}>
        <ExplorePage />
      </IdeaCardScope>,
    );
    expect(container.querySelectorAll("[data-idea-card]")).toHaveLength(lessons.length);
    await userEvent.click(screen.getByRole("button", { name: "Idea card: Zooming out" }));
    expect(open).toHaveBeenCalledWith("zooming-out");
  });

  it("says which stars are earned in words as well as in the picture", () => {
    const { container } = render(<ExplorePage />);
    expect(screen.getAllByText(/^Not yet: /)).toHaveLength(achievements.length);
    act(() =>
      progressStore.setState({ ...progressStore.getState(), achievements: ["sandbox-garden"] }),
    );
    const earned = container.querySelectorAll('[data-earned="true"]');
    expect(earned).toHaveLength(1);
    expect(earned[0]).not.toHaveTextContent("Not yet");
  });
});
