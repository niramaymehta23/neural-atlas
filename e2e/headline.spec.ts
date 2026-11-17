import { expect, test, type Page } from "@playwright/test";
import { expectSixtyFps, frameGaps, settle } from "./frames";

/** Console errors, page errors and any request that leaves this site (COEP forbids them). */
function watch(page: Page) {
  const errors: string[] = [];
  const elsewhere: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const { protocol, hostname } = new URL(request.url());
    if (protocol.startsWith("http") && hostname !== "localhost") elsewhere.push(request.url());
  });
  return { errors, elsewhere };
}

const LESSONS = [
  {
    id: "rolling-downhill",
    title: "Rolling downhill",
    term: "Gradient descent",
    opening: /lost on a foggy hillside/,
  },
  {
    id: "stacking-cells",
    title: "Stacking cells",
    term: "Neural network",
    opening: /Two kinds of flowers grow in a garden/,
  },
  {
    id: "who-is-looking-at-whom",
    title: "Who is looking at whom",
    term: "Attention",
    opening: /your eyes flick back/,
  },
  {
    id: "scoring-every-move",
    title: "Scoring every move",
    term: "Q-learning",
    opening: /A puppy wants to reach its food bowl/,
  },
] as const;

for (const lesson of LESSONS) {
  test(`${lesson.title} opens on its story, with the real name kept back`, async ({ page }) => {
    const { errors, elsewhere } = watch(page);
    await page.goto(`/learn/${lesson.id}`);
    await expect(page.getByRole("heading", { name: lesson.title })).toBeVisible();
    await expect(page.getByText(lesson.opening)).toBeVisible();
    await expect(
      page.locator("[data-region=dock]").getByRole("region", { name: "Mission" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Make a guess" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Peek under the hood" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.getByText(lesson.term, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Still being drawn")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
    expect(elsewhere).toEqual([]);
  });
}

test("rolling downhill: huge steps fly off the map and earn the star", async ({ page }) => {
  await page.goto("/learn/rolling-downhill");
  await page.getByRole("slider", { name: "How big a step" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "Let them roll" }).click();
  await expect(page.locator("[data-region=dock]").getByText("You earned a star.")).toBeVisible();
  await expect(page.getByText("Gradient descent")).toBeVisible();
  await page.getByRole("button", { name: "Watch why it happened" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("stacking cells: the boundary morphs at 60 fps while the team learns", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "frame timing");
  const { errors } = watch(page);
  await page.goto("/learn/stacking-cells");
  const scene = page.getByTestId("stacking-cells");
  await page.getByRole("button", { name: "Let it learn" }).click();
  await expect.poll(async () => Number(await scene.getAttribute("data-epoch"))).toBeGreaterThan(20);
  await settle(page);
  const before = Number(await scene.getAttribute("data-epoch"));
  expectSixtyFps(await frameGaps(page, 3));
  // Still learning throughout the measurement, so the field kept being redrawn.
  expect(Number(await scene.getAttribute("data-epoch"))).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});

test("who is looking at whom: threads within 3 s once cached, and dragging re-routes them", async ({
  page,
}) => {
  const { errors, elsewhere } = watch(page);
  const looking = page.getByTestId("looking");
  await page.goto("/learn/who-is-looking-at-whom");
  await expect(looking).toHaveAttribute("data-ready", "true", { timeout: 60_000 });

  await page.reload();
  const started = Date.now();
  await expect(looking).toHaveAttribute("data-ready", "true", { timeout: 3_000 });
  test
    .info()
    .annotations.push({ type: "threads", description: `${Date.now() - started} ms after reload` });
  await expect(page.locator("[data-thread]").first()).toBeAttached();

  const sentence = page.getByRole("textbox", { name: "Type your own sentence" });
  const before = await sentence.inputValue();
  const dog = page.locator("[data-word=dog]");
  const road = page.locator("[data-word=road]");
  const from = (await dog.boundingBox())!;
  const to = (await road.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(sentence).not.toHaveValue(before);
  await expect(sentence).toHaveValue(/road dog/);
  await expect(looking).toHaveAttribute("data-ready", "true");
  await expect(page.locator("[data-thread]").first()).toBeAttached();

  expect(elsewhere).toEqual([]);
  expect(errors).toEqual([]);
});

test("scoring every move: paint the board mid-practice, then learn too fast to settle", async ({
  page,
}) => {
  const { errors } = watch(page);
  await page.goto("/learn/scoring-every-move");
  const scene = page.getByTestId("scoring-every-move");
  await page.getByRole("slider", { name: "How fast to play" }).focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "Let it practise" }).click();
  await expect.poll(async () => Number(await scene.getAttribute("data-tries"))).toBeGreaterThan(5);

  // Paint a wall while it practises: the board changes and learning carries on.
  const corner = scene.locator("[data-tile]").first();
  await expect(corner).toHaveAttribute("data-tile", "floor");
  await corner.click();
  await expect(corner).toHaveAttribute("data-tile", "wall");
  const tries = Number(await scene.getAttribute("data-tries"));
  await expect
    .poll(async () => Number(await scene.getAttribute("data-tries")))
    .toBeGreaterThan(tries);
  await expect(scene.locator("[data-arrow=best]").first()).toBeAttached();

  await page.getByRole("slider", { name: "How fast it learns" }).focus();
  await page.keyboard.press("End");
  await expect(page.locator("[data-region=dock]").getByText("You earned a star.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Q-learning")).toBeVisible();
  expect(errors).toEqual([]);
});
