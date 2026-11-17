import { expect, test, type Locator, type Page } from "@playwright/test";
import { watch } from "./watch";

/**
 * H3b hardening of "Who is looking at whom" (docs/hardening/lessons.md ATT-*, A11Y-19, LIVE-13):
 * the real model in the browser, the learner's own words, the hog mission, the guess, moving
 * words by mouse, finger and keyboard, layout at every width, and the reader gallery.
 */
const LESSON = "/learn/who-is-looking-at-whom";
/** One interesting word among tiny ones: the mission's hint, followed. */
const HOG_SENTENCE = "a a a a a a a a banana a a a a a a a";

const scene = (page: Page) => page.getByTestId("looking");
const sentence = (page: Page) => page.getByRole("textbox", { name: "Type your own sentence" });
const chip = (page: Page, word: string) => scene(page).locator(`[data-word="${word}"]`);

async function open(page: Page) {
  await page.goto(LESSON);
  await expect(scene(page)).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
}

async function retype(page: Page, text: string) {
  await sentence(page).fill(text);
  await expect(scene(page)).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
}

/** A chip's box once fonts have loaded and it has stopped springing into place. */
async function restingBox(page: Page, chip: Locator) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  let last = "";
  await expect
    .poll(async () => {
      const box = JSON.stringify(await chip.boundingBox());
      const still = box === last;
      last = box;
      return still;
    })
    .toBe(true);
  const box = await chip.boundingBox();
  if (!box) throw new Error("the chip is not on screen");
  return box;
}

/** Pairs of word chips whose boxes overlap (there should be none). */
async function overlapping(chips: Locator) {
  const boxes = await chips.evaluateAll((elements) =>
    elements.map((element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { word: element.getAttribute("data-word"), left, right, top, bottom };
    }),
  );
  return boxes.flatMap((a, i) =>
    boxes
      .slice(i + 1)
      .filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
      .map((b) => `${a.word} / ${b.word}`),
  );
}

test("the first load shows its progress and then the threads (ATT-03)", async ({
  page,
  context,
}) => {
  const { errors, elsewhere } = watch(page);
  // Hold the model back so the runtime's share of the bar shows first.
  await context.route("**/models/attention-minilm-v1/onnx/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });
  await page.goto(LESSON);
  const bar = page.getByRole("progressbar", { name: "How much of the reader has arrived" });
  await expect(bar).toBeVisible();
  await expect(page.getByText(/coming to your browser/)).toBeVisible();
  await expect
    .poll(async () => Number(await bar.getAttribute("data-progress")), { timeout: 30_000 })
    .toBeGreaterThan(0);
  await expect(scene(page)).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  await expect(bar).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("chips are the learner's own words, and moving one keeps its spelling (ATT-04)", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page);
  await retype(page, "Héllo, can't 😀 said Zoë");
  const shown = await scene(page)
    .locator("[data-word]")
    .evaluateAll((chips) => chips.map((chip) => chip.textContent));
  expect(shown).toEqual(["Héllo,", "can't", "😀", "said", "Zoë"]);
  await chip(page, "Zoë").click();
  await page.getByRole("button", { name: "Move “Zoë” one place earlier" }).click();
  await expect(sentence(page)).toHaveValue("Héllo, can't 😀 Zoë said");
  expect(errors).toEqual([]);
});

test("short sentences never win the hog star; the hint sentence read deep does (ATT-01)", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page);
  const star = page.locator("[data-region=dock]").getByText("You earned a star.");
  const deep = page.getByRole("slider", { name: "How deep it reads" });
  await deep.focus();
  await page.keyboard.press("End");
  for (const short of ["hi there", "the cat sat", "a a banana a"]) await retype(page, short);
  await expect(star).toHaveCount(0);
  await retype(page, HOG_SENTENCE);
  await expect(star).toBeVisible();
  expect(errors).toEqual([]);
});

test("the guess waits for the example sentence and offers it back (ATT-08, ATT-02)", async ({
  page,
}) => {
  await open(page);
  const card = page.getByRole("region", { name: "Make a guess" });
  await card.getByRole("button", { name: "“tired”" }).click();
  await retype(page, "my cat is asleep");
  await expect(page.getByText("The guess needs the example sentence.")).toBeVisible();
  await expect(
    card.getByRole("button", { name: /Show me what happens|Play a little more/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Bring back the example sentence" }).click();
  await expect(scene(page)).toHaveAttribute("data-ready", "true");
  // Whatever the dials say, the answer is the same.
  for (const key of ["Home", "End"]) {
    await page.getByRole("slider", { name: "How deep it reads" }).focus();
    await page.keyboard.press(key);
    await expect(
      card.getByRole("button", { name: /Show me what happens|Play a little more/ }),
    ).toBeEnabled();
  }
  await card.getByRole("button", { name: /Show me what happens|Play a little more/ }).click();
  await expect(card.getByText(/“tired”/).first()).toBeVisible();
});

test("too few words gets a nudge, not silence (ATT-07)", async ({ page }) => {
  await open(page);
  await sentence(page).fill("hello");
  await expect(page.getByText("Type a few words to see them look at each other.")).toBeVisible();
});

test("dragging a word does not also pick it, and keeps the picked word picked (ATT-12)", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page);
  const it = chip(page, "it");
  await expect(it).toHaveAttribute("aria-pressed", "true");
  const from = await restingBox(page, chip(page, "dog"));
  const to = await restingBox(page, chip(page, "road"));
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(sentence(page)).toHaveValue(/road dog/);
  await expect(scene(page)).toHaveAttribute("data-ready", "true");
  await expect(it).toHaveAttribute("aria-pressed", "true");
  await expect(chip(page, "dog")).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("words move from the keyboard with Space and the arrows, announced (ATT-13)", async ({
  page,
}) => {
  await open(page);
  await chip(page, "dog").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(sentence(page)).toHaveValue(/did not dog cross/);
  await expect(scene(page).locator("[aria-live]")).toHaveText("“dog” moved after “not”.");
  // Alt+Left is the browser's Back: it must not move words or leave the lesson.
  await chip(page, "dog").focus();
  await expect(chip(page, "dog")).not.toHaveAttribute("aria-keyshortcuts", /Alt/);
});

test("chips say who they look at, and a new sentence dims the old picture (ATT-14, ATT-15)", async ({
  page,
}) => {
  await open(page);
  await expect(chip(page, "it")).toHaveAccessibleDescription(/It looks most at “.+”/);
  await sentence(page).press("End");
  await sentence(page).pressSequentially(" again");
  await expect(scene(page)).toHaveAttribute("data-reading", "true");
  await expect(scene(page)).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  await expect(scene(page)).toHaveAttribute("data-reading", "false");
});

test("the default sentence fits at 1024px with no overlap, also with wider text (A11Y-19, LIVE-13)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await open(page);
  const row = scene(page).locator("[data-thread-row]");
  const fits = () => row.evaluate((element) => element.scrollWidth <= element.clientWidth);
  await expect(row).toHaveAttribute("data-orientation", "row");
  expect(await fits()).toBe(true);
  await expect.poll(() => overlapping(scene(page).locator("[data-word]"))).toEqual([]);
  // WCAG text-spacing overrides: chips are re-measured and still never overlap.
  await page.addStyleTag({
    content:
      "* { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; line-height: 1.5 !important; }",
  });
  await retype(page, "Extraordinary penguins waddled awkwardly across slippery glaciers yesterday");
  await expect.poll(() => overlapping(scene(page).locator("[data-word]"))).toEqual([]);
  expect(await fits()).toBe(true);
});

test("at 768px the default sentence stands in a column that needs no sideways scrolling (A11Y-19)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await open(page);
  const row = scene(page).locator("[data-thread-row]");
  expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect.poll(() => overlapping(scene(page).locator("[data-word]"))).toEqual([]);
  await expect(page.getByText(/Threads on the right go forward/)).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("sixteen words never overlap, and a swipe on a word scrolls the page (ATT-11)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "touch is driven through Chrome's protocol");
    await open(page);
    const sixteen =
      "we all like big red ripe sweet crunchy apples more than any other kind of fruit";
    await retype(page, sixteen);
    expect(await scene(page).locator("[data-word]").count()).toBe(16);
    await expect.poll(() => overlapping(scene(page).locator("[data-word]"))).toEqual([]);
    const row = scene(page).locator("[data-thread-row]");
    expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

    const word = chip(page, "apples");
    await word.scrollIntoViewIfNeeded();
    const box = (await word.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const before = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", at: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y: at }],
      });
    await touch("touchStart", y);
    for (let step = 1; step <= 8; step += 1) await touch("touchMove", y - step * 25);
    await touch("touchEnd", y - 200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await expect(sentence(page)).toHaveValue(sixteen);
  });
});

test("every reader has a plain name and a card in the gallery (ATT-19, ATT-09)", async ({
  page,
}) => {
  const { errors } = watch(page);
  await open(page);
  await page.getByRole("button", { name: "See every reader at once" }).click();
  const cards = scene(page).locator("[data-reader]");
  await expect(cards).toHaveCount(12);
  await expect(cards.first()).toContainText(/^the one that/);
  await cards.nth(2).click();
  await expect(scene(page).locator("[data-gallery]")).toHaveCount(0);
  const dial = page.getByRole("slider", { name: "Which reader" });
  await expect(dial).toHaveAttribute("aria-valuenow", "3");
  await expect(dial).toHaveAttribute("aria-valuetext", /^the one that/);
  await expect(dial).not.toHaveAttribute("aria-valuetext", /reader \w+$/);
  expect(errors).toEqual([]);
});

test("the drawer credits the model (ATT-17)", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Peek under the hood" }).click();
  await expect(page.getByText(/all-MiniLM-L6-v2, made by sentence-transformers/)).toBeVisible();
});
