import { words } from "../src/modules/w6-reinforcement/thinking-ahead/captions";
import { FUTURES, PUZZLE, THREAT } from "../src/modules/w6-reinforcement/thinking-ahead/model";
import { GROSS, measureFrames, settle, summarise } from "./frames";
import {
  attributeOf,
  dialSays,
  expect,
  linkKeeps,
  open,
  slowed,
  starred,
  test,
  turn,
  type Reader,
} from "./w6";
import type { Page } from "@playwright/test";

/** Thinking ahead. Wording comes from its captions.ts. */
const id = "thinking-ahead";
const scene = (page: Page) => page.getByTestId(id).first();
const column = (page: Page, at: number) => scene(page).locator(`[data-column='${at}']`);
const moves = (page: Page) => scene(page).getAttribute("data-moves");

test("a disc drops at once, the tree grows while it thinks, and the page keeps answering", async ({
  page,
}) => {
  await open(page, id);
  await settle(page);
  const idle = await measureFrames(page, 1);

  // Keyboard: the middle column, Enter drops.
  await column(page, 3).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => moves(page)).toBe("3");

  // While it thinks: the games it has imagined climb step by step, a tap on the board is
  // answered before the next frame, and the main thread is no busier than the idle page.
  const busy = measureFrames(page, 1);
  const seen: number[] = [];
  await expect
    .poll(
      async () => {
        seen.push(Number(await scene(page).getAttribute("data-games")));
        return new Set(seen.filter((games) => games > 0)).size;
      },
      { intervals: [50] },
    )
    .toBeGreaterThanOrEqual(3);
  const answered = await column(page, 0).evaluate(
    (button) =>
      new Promise<string>((resolve) => {
        (button as HTMLButtonElement).click();
        requestAnimationFrame(() =>
          resolve(document.querySelector("[data-status]")?.textContent ?? ""),
        );
      }),
  );
  expect(answered).toBe(words.status.wait);
  const thinking = summarise(await busy);
  expect(thinking.longTaskMsPer3s - summarise(idle).longTaskMsPer3s).toBeLessThan(
    GROSS.longTaskMsPer3s,
  );

  // A dial turned mid-thought starts a clean search: it ends exactly at the new count.
  await page.getByRole("button", { name: words.newGame }).click();
  await column(page, 2).click();
  await expect(scene(page)).toHaveAttribute("data-thinking", "busy");
  await turn(page, words.futures.label, "ArrowLeft");
  await expect(scene(page)).toHaveAttribute("data-games", String(FUTURES[4]), { timeout: 20_000 });
  await expect.poll(() => moves(page), { timeout: 20_000 }).toHaveLength(2);
});

test("looking one move ahead it misses your slant, and you earn the star", async ({ page }) => {
  await open(page, id);
  await turn(page, words.futures.label, "Home");
  await page.getByRole("button", { name: words.puzzle }).click();
  await expect.poll(() => moves(page), { timeout: 20_000 }).toBe(`${PUZZLE.join("")}3`);
  await column(page, THREAT).click();
  await starred(page);
  await expect(scene(page).locator("[data-winning]")).toBeVisible();
});

test("works by touch, and a link replays the game and its thinking", async ({ browser }) => {
  const context = await slowed(await browser.newContext({ hasTouch: true }));
  const page = await context.newPage();
  await open(page, id);
  await column(page, 0).tap();
  await expect.poll(() => moves(page), { timeout: 20_000 }).toHaveLength(2);
  await turn(page, words.length.label, "ArrowLeft", 2);
  await expect(scene(page)).toHaveAttribute("data-thinking", "done", { timeout: 20_000 });
  const favourite: Reader = attributeOf(`[data-testid=${id}] [data-favourite]`, "data-favourite");
  await linkKeeps(page, context, id, [
    attributeOf(`[data-testid=${id}]`, "data-moves"),
    favourite,
    dialSays(words.futures.label),
    dialSays(words.length.label),
  ]);
  await context.close();
});
