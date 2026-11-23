import { fireEvent, render, screen } from "@testing-library/react";
import type * as Catalog from "@/catalog";
import { lessonById } from "@/catalog";
import { LessonStage } from "./LessonStage";

vi.mock("@/catalog", async (original) => {
  const catalog = await original<typeof Catalog>();
  return { ...catalog, lessonById: vi.fn(catalog.lessonById) };
});

const WAIT = { timeout: 10_000 };
const LIMIT = 30_000;

describe("a lesson's scene inside another page", () => {
  it(
    "plays the lesson's own scene and dials, with a way to the whole lesson",
    async () => {
      const onTouch = vi.fn();
      render(<LessonStage id="safe-vs-adventurous" onTouch={onTouch} />);
      const [slider] = await screen.findAllByRole("slider", undefined, WAIT);
      expect(screen.getByRole("link", { name: /Open the whole lesson/ })).toHaveAttribute(
        "href",
        "/learn/safe-vs-adventurous",
      );
      expect(onTouch).not.toHaveBeenCalled();
      fireEvent.keyDown(slider as HTMLElement, { key: "ArrowRight" });
      expect(onTouch).toHaveBeenCalled();
    },
    LIMIT,
  );

  it(
    "says so when the lesson cannot be fetched, and tries again",
    async () => {
      const real = lessonById("rolling-downhill");
      if (!real?.load) throw new Error("no lesson");
      const load = vi.fn(real.load).mockRejectedValueOnce(new Error("offline"));
      vi.mocked(lessonById).mockReturnValue({ ...real, load } as typeof real);
      render(<LessonStage id="rolling-downhill" />);
      expect(await screen.findByRole("alert", undefined, WAIT)).toHaveTextContent(/couldn’t load/);
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), WAIT);
      await screen.findByRole("link", { name: /Open the whole lesson/ }, WAIT);
    },
    LIMIT,
  );
});
