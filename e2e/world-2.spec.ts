import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

const LESSONS = [
  {
    id: "ask-the-neighbours",
    title: "Ask the neighbours",
    term: "k-nearest neighbours",
    opening: /A new family moves into town/,
  },
  {
    id: "twenty-questions",
    title: "Twenty questions",
    term: "Decision tree",
    opening: /Two kinds of birds nest in a park/,
  },
  {
    id: "wisdom-of-the-crowd",
    title: "Wisdom of the crowd",
    term: "Random forest",
    opening: /nest in the park again/,
  },
  {
    id: "the-mistake-relay",
    title: "The mistake relay",
    term: "Gradient boosting",
    opening: /a relay team of runners/,
  },
  {
    id: "the-widest-road",
    title: "The widest road",
    term: "Support vector machine",
    opening: /Two villages share a valley/,
  },
  {
    id: "the-spam-detective",
    title: "The spam detective",
    term: "Naive Bayes",
    opening: /A detective reads every message/,
  },
  {
    id: "finding-natural-groups",
    title: "Finding natural groups",
    term: "Clustering (k-means)",
    opening: /dots with no names at all/,
  },
  {
    id: "the-best-shadow",
    title: "The best shadow",
    term: "PCA",
    opening: /A cloud of dots floats in the air/,
  },
  {
    id: "a-map-of-everything",
    title: "A map of everything",
    term: "t-SNE / UMAP",
    opening: /measured ten different ways/,
  },
  {
    id: "is-99-percent-actually-good",
    title: "Is 99% actually good?",
    term: "Evaluation metrics",
    opening: /throws out the ones it thinks have a worm/,
  },
] as const;

const dock = (page: Page) => page.locator("[data-region=dock]");
const slider = (page: Page, name: string) => page.getByRole("slider", { name });

/** Moves a dial with its keys: Home or End, then a number of steps up. */
async function turn(page: Page, name: string, key: "Home" | "End", up = 0) {
  const dial = slider(page, name);
  await dial.focus();
  await page.keyboard.press(key);
  for (let step = 0; step < up; step += 1) await page.keyboard.press("ArrowUp");
}

async function earnsStar(page: Page, term: string) {
  await expect(dock(page).getByText("You earned a star.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(term, { exact: true }).first()).toBeVisible();
}

for (const lesson of LESSONS) {
  test(`${lesson.title} opens on its story, with the real name kept back`, async ({ page }) => {
    const { errors, elsewhere } = watch(page);
    await page.goto(`/learn/${lesson.id}`);
    await expect(page.getByRole("heading", { name: lesson.title })).toBeVisible();
    await expect(page.getByText(lesson.opening)).toBeVisible();
    await expect(dock(page).getByRole("region", { name: "Mission" })).toBeVisible();
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

test.describe("each World 2 mission can be earned", () => {
  test("ask the neighbours: one neighbour decides for the odd one out", async ({ page }) => {
    await page.goto("/learn/ask-the-neighbours");
    await turn(page, "How many neighbours to ask", "Home");
    const town = page.getByRole("application");
    const box = await town.boundingBox();
    if (!box) throw new Error("the town is not drawn");
    // The odd Owls fan at (0.42, 0.3), in a street of Foxes fans.
    await town.click({ position: { x: (1.42 / 2) * box.width, y: (0.7 / 2) * box.height } });
    await earnsStar(page, "k-nearest neighbours");
  });

  test("twenty questions: a long row of questions remembers every nest", async ({ page }) => {
    await page.goto("/learn/twenty-questions");
    await turn(page, "How many questions in a row", "End");
    await earnsStar(page, "Decision tree");
  });

  test("wisdom of the crowd: trees with no variety all agree", async ({ page }) => {
    await page.goto("/learn/wisdom-of-the-crowd");
    await turn(page, "How different the trees are", "Home");
    await earnsStar(page, "Random forest");
  });

  test("the mistake relay: hard pushes chase the noise", async ({ page }) => {
    await page.goto("/learn/the-mistake-relay");
    await turn(page, "How hard each runner pushes", "End");
    await turn(page, "Questions each runner asks", "End");
    const addTen = dock(page).getByRole("button", { name: "Add ten runners" });
    for (let round = 0; round < 6; round += 1) await addTen.click();
    await earnsStar(page, "Gradient boosting");
  });

  test("the widest road: pulling up a lamp post moves the road", async ({ page }) => {
    await page.goto("/learn/the-widest-road");
    const post = page.locator("[data-post] circle").first();
    const x = Number(await post.getAttribute("cx"));
    const y = Number(await post.getAttribute("cy"));
    await page.getByRole("radio", { name: "Pull a home up" }).click();
    const valley = page.getByRole("application");
    const box = await valley.boundingBox();
    if (!box) throw new Error("the valley is not drawn");
    await valley.click({
      position: { x: ((x + 1) / 2) * box.width, y: ((1 - y) / 2) * box.height },
    });
    await earnsStar(page, "Support vector machine");
  });

  test("the spam detective: spammy words hide among friendly ones", async ({ page }) => {
    await page.goto("/learn/the-spam-detective");
    const box = page.getByLabel("The message");
    await box.fill(
      "free win prize see you at the school library after lunch thanks for the birthday cake",
    );
    await expect(page.getByTestId("the-spam-detective")).toHaveAttribute("data-verdict", "normal");
    await earnsStar(page, "Naive Bayes");
  });

  test("finding natural groups: two magnets on three piles", async ({ page }) => {
    await page.goto("/learn/finding-natural-groups");
    await turn(page, "How many magnets", "Home", 1);
    await dock(page).getByRole("button", { name: "Move until they stop" }).click();
    await earnsStar(page, "Clustering (k-means)");
  });

  test("the best shadow: looking straight along the stick", async ({ page }) => {
    await page.goto("/learn/the-best-shadow");
    await page.getByRole("radio", { name: "A tilted stick" }).click();
    await turn(page, "Walk the torch around", "Home", 13);
    await turn(page, "Raise the torch", "Home", 39);
    await earnsStar(page, "PCA");
  });

  test("is 99% actually good: a lazy sorter scores 99", async ({ page }) => {
    await page.goto("/learn/is-99-percent-actually-good");
    await turn(page, "How many wormy apples in every hundred", "Home");
    await turn(page, "How suspicious the sorter is", "Home");
    await expect(
      page.getByTestId("is-99-percent-actually-good").getByText("Right overall: 99 out of 100"),
    ).toBeVisible();
    await earnsStar(page, "Evaluation metrics");
  });

  test("a map of everything: islands drawn from pure noise", async ({ page }) => {
    const { errors, elsewhere } = watch(page);
    await page.goto("/learn/a-map-of-everything");
    await page.getByRole("radio", { name: "Random noise" }).click();
    await turn(page, "How many things", "Home");
    await turn(page, "How many neighbours each dot listens to", "Home");
    await dock(page).getByRole("button", { name: "Let it settle" }).click();
    await earnsStar(page, "t-SNE / UMAP");
    expect(errors).toEqual([]);
    expect(elsewhere).toEqual([]);
  });
});

test("a map of a thousand things settles in its worker while the page keeps answering", async ({
  page,
}) => {
  const { errors } = watch(page);
  await page.goto("/learn/a-map-of-everything");
  await turn(page, "How many things", "End");
  const map = page.getByTestId("a-map-of-everything");
  await dock(page).getByRole("button", { name: "Let it settle" }).click();
  await expect.poll(async () => Number(await map.getAttribute("data-step"))).toBeGreaterThan(20);
  // The page answers a tap at once while the map is still settling.
  await dock(page).getByRole("button", { name: "Pause" }).click();
  await expect(dock(page).getByRole("button", { name: "Let it settle" })).toBeVisible({
    timeout: 1_000,
  });
  const paused = Number(await map.getAttribute("data-step"));
  expect(paused).toBeLessThan(1000);
  expect(errors).toEqual([]);
});
