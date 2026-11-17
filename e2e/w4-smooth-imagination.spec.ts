import { expect, test, type Page } from "@playwright/test";
import { watch } from "./watch";

/** Smooth imagination. Wording comes from src/modules/w4-deep-architectures/smooth-imagination/captions.ts. */
const dock = (page: Page) => page.locator("[data-region=dock]");
const verdict = (page: Page) => page.locator("[data-nonsense]");
const map = (page: Page) => page.getByRole("group", { name: /^Map of faces/ });

async function open(page: Page) {
  await page.goto("/learn/smooth-imagination");
  await expect(page.getByTestId("smooth-imagination")).toBeVisible({ timeout: 20_000 });
  await expect(verdict(page)).toBeVisible({ timeout: 20_000 });
}

test("glides with the arrow keys, and finds nonsense in the untidy map's corner", async ({
  page,
}) => {
  const { errors, elsewhere } = watch(page);
  await open(page);
  await expect(page.getByText("VAE", { exact: true })).toHaveCount(0);
  await expect(verdict(page)).toHaveAttribute("data-nonsense", "false");
  await dock(page).getByRole("button", { name: "No, some spots are nonsense" }).click();
  await page.getByRole("slider", { name: "How tidy the map is kept" }).focus();
  await page.keyboard.press("Home");
  await expect(page.locator("[data-arriving=false]")).toBeVisible({ timeout: 20_000 });
  await dock(page).getByRole("button", { name: "Show me what happens" }).click({ timeout: 20_000 });
  await expect(dock(page).getByText("Spot on.")).toBeVisible();
  await map(page).focus();
  for (let press = 0; press < 20; press += 1) {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
  }
  await expect(verdict(page)).toHaveAttribute("data-nonsense", "true");
  await expect(dock(page).getByText("You earned a star.")).toBeVisible();
  expect(errors).toEqual([]);
  expect(elsewhere).toEqual([]);
});

test("a tap moves the marker, and a link opens on the same spot", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const box = await map(page).boundingBox();
  await page.mouse.click(box!.x + box!.width * 0.3, box!.y + box!.height * 0.7);
  const moved = await page.locator("[data-marker]").getAttribute("transform");
  expect(moved).not.toBe("translate(50 50)");
  await page.getByRole("button", { name: "Copy a link to this view" }).click();
  await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

  const fresh = await context.newPage();
  await fresh.goto(`/learn/smooth-imagination${new URL(page.url()).hash}`);
  await expect(fresh.locator("[data-marker]")).toHaveAttribute("transform", moved!, {
    timeout: 20_000,
  });
});

test("a finger swipe over the map scrolls the page instead of moving the marker", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 375, height: 700 },
  });
  const page = await context.newPage();
  await open(page);
  const before = await page.locator("[data-marker]").getAttribute("transform");
  const box = await map(page).boundingBox();
  const client = await context.newCDPSession(page);
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y - 150 }],
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("[data-marker]")).toHaveAttribute("transform", before!);
  await context.close();
});
