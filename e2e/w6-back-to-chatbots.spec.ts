import { words } from "../src/modules/w6-reinforcement/back-to-chatbots/captions";
import { runEnded } from "./runs";
import {
  attributeOf,
  dialSays,
  dock,
  expect,
  linkKeeps,
  open,
  slowed,
  starred,
  test,
  turn,
} from "./w6";

/** Back to chatbots. Wording comes from its captions.ts. */
const id = "back-to-chatbots";

test("trains on its leash, then over-trained with no leash it only flatters, and earns the star", async ({
  page,
}) => {
  await open(page, id);
  await expect(page.getByText(words.oldSelf)).toBeVisible();
  await dock(page).getByRole("button", { name: words.start }).click();
  await runEnded(page, 30_000);
  await expect(page.locator("[data-verdict]")).toHaveText(words.verdict.some);
  await turn(page, words.leash.label, "Home");
  await turn(page, words.train.label, "End");
  await starred(page);
  await expect(page.locator("[data-verdict]")).toHaveText(words.verdict.flatters);
  await expect(page.getByRole("link", { name: words.thumbs })).toHaveAttribute(
    "href",
    "/learn/learning-from-thumbs-up",
  );
});

test("works by touch, and a link replays the same training", async ({ browser }) => {
  const context = await slowed(
    await browser.newContext({ hasTouch: true, reducedMotion: "reduce" }),
  );
  const page = await context.newPage();
  await open(page, id);
  await turn(page, words.taste.label, "ArrowRight", 4);
  await turn(page, words.leash.label, "ArrowLeft", 10);
  await dock(page).getByRole("button", { name: words.start }).tap();
  await runEnded(page, 30_000);
  const fresh = await linkKeeps(page, context, id, [
    attributeOf("[data-testid=back-to-chatbots]", "data-praise"),
    attributeOf("[data-trait=flatters]", "data-weight"),
    dialSays(words.taste.label),
    dialSays(words.leash.label),
  ]);
  await expect(fresh.locator("[data-verdict]")).toBeVisible();
  await context.close();
});
