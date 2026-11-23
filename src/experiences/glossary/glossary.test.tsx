import { fireEvent, render, screen, within } from "@testing-library/react";
import { lessonById, lessons } from "@/catalog";
import { progressStore } from "@/platform/progress/progress";
import { IdeaCardButton } from "@/ui/glossary/idea-cards";
import { ideaCards } from "./captions";
import { nearby } from "./IdeaCardDialog";
import { cardConnection, CARDS_FOR_STAR, IdeaCards } from "./IdeaCards";
import { Mini } from "./Mini";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
const WAIT = { timeout: 10_000 };
const realLoad = cardConnection.load;
afterEach(() => {
  cardConnection.load = realLoad;
});

describe("the cards", () => {
  it("cover every idea, and nothing else", () => {
    expect(Object.keys(ideaCards).sort()).toEqual(lessons.map(({ id }) => id).sort());
  });

  it.each(lessons.map(({ id, realTerm }) => [id, realTerm] as const))(
    "%s says its idea without its real name, and its small thing can be played with",
    (id, realTerm) => {
      const card = ideaCards[id];
      if (!card) throw new Error("no card");
      expect(card.idea.length).toBeGreaterThan(30);
      expect(card.idea.length).toBeLessThan(150);
      expect(card.idea.toLowerCase()).not.toContain(realTerm.toLowerCase());
      const onTouch = vi.fn();
      const { container } = render(<Mini spec={card.mini} onTouch={onTouch} />);
      const before = container.innerHTML;
      const button = screen.queryAllByRole("button")[0];
      const slider = screen.queryAllByRole("slider")[0];
      if (slider) fireEvent.keyDown(slider, { key: "ArrowRight" });
      else if (button) fireEvent.click(button);
      expect(onTouch).toHaveBeenCalled();
      expect(container.innerHTML).not.toBe(before);
    },
  );

  it("lead to ideas that exist", () => {
    for (const { id } of lessons) {
      expect(nearby(id).length, id).toBeGreaterThan(0);
      for (const near of nearby(id)) expect(lessonById(near)).toBeDefined();
    }
  });
});

describe("opening a card", () => {
  it("has no button where there are no cards", () => {
    render(<IdeaCardButton about="rolling-downhill" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  const open = async (about: string) => {
    render(
      <IdeaCards>
        <IdeaCardButton about={about} />
      </IdeaCards>,
    );
    const button = screen.getByRole("button", { name: "Idea card" });
    button.focus();
    fireEvent.click(button);
    return screen.findByRole("dialog", { name: lessonById(about)?.title }, WAIT);
  };

  it("says the real name only once the small thing has been played with", async () => {
    const card = within(await open("rolling-downhill"));
    expect(card.queryByText("Gradient descent")).toBeNull();
    fireEvent.click(card.getByRole("button", { name: "Take a step" }));
    expect(card.getByText("Gradient descent")).toBeVisible();
  });

  it("goes on to ideas close by, and closes with Escape", async () => {
    const card = within(await open("rolling-downhill"));
    const [near] = nearby("rolling-downhill");
    fireEvent.click(card.getByRole("button", { name: lessonById(near ?? "")?.title }));
    await screen.findByRole("dialog", { name: lessonById(near ?? "")?.title }, WAIT);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says so when the cards cannot be fetched, and tries again", async () => {
    cardConnection.load = vi.fn().mockRejectedValue(new Error("offline"));
    render(
      <IdeaCards>
        <IdeaCardButton about="zooming-out" />
      </IdeaCards>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Idea card" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load/);
    cardConnection.load = realLoad;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("dialog", { name: "Zooming out" }, WAIT);
  });

  it("earns its star with different cards, not one card often", async () => {
    render(
      <IdeaCards>
        {["zooming-out", "loopholes", "rolling-downhill"].map((id) => (
          <div key={id} data-testid={id}>
            <IdeaCardButton about={id} />
          </div>
        ))}
      </IdeaCards>,
    );
    const tap = async (id: string) => {
      const button = within(screen.getByTestId(id)).getByRole("button", { hidden: true });
      fireEvent.click(button);
      await screen.findByRole("dialog", undefined, WAIT);
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    };
    for (let again = 0; again < CARDS_FOR_STAR + 1; again += 1) await tap("zooming-out");
    expect(progressStore.getState().achievements).not.toContain("words");
    await tap("loopholes");
    await tap("rolling-downhill");
    await vi.waitFor(() => expect(progressStore.getState().achievements).toContain("words"));
  });
});
