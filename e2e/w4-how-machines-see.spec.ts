import { expect, test, type Page } from "@playwright/test";
import { FAKE_CAMERA, reads, refuseCamera } from "./camera";
import { budget, recordPerf } from "./frames";
import { GPU } from "./gpu";
import { watch } from "./watch";

/** How machines see. Wording comes from src/modules/w4-deep-architectures/how-machines-see/captions.ts. */
test.use(FAKE_CAMERA);

const dock = (page: Page) => page.locator("[data-region=dock]");
const answer = (page: Page) => page.locator("[data-answer]");
const maps = (page: Page) => page.locator("[data-maps]");

async function open(page: Page, hash = "") {
  await page.goto(`/learn/how-machines-see${hash}`);
  await expect(page.getByTestId("how-machines-see")).toBeVisible({ timeout: 20_000 });
}
test.describe("How machines see", { tag: GPU }, () => {
  test("names the photo, shows each layer's maps, and a faint smudge fools it for the star", async ({
    page,
  }) => {
    const { errors, elsewhere } = watch(page);
    await open(page);
    await expect(page.getByText("CNN", { exact: true })).toHaveCount(0);
    await expect(answer(page)).toHaveText("The AI says: boxer.", { timeout: 60_000 });
    await expect(maps(page)).toHaveAttribute("data-maps", "edges");
    await page.getByRole("radio", { name: "Deep: parts" }).click();
    await expect(maps(page)).toHaveAttribute("data-maps", "parts");
    await dock(page).getByRole("button", { name: "No, it will say something else" }).click();
    await page.getByRole("switch", { name: "Add a faint smudge" }).click();
    await expect(answer(page)).toHaveText(/^Before the smudge it said boxer\. Now it says /, {
      timeout: 60_000,
    });
    await expect(dock(page).getByText("You earned a star.")).toBeVisible();
    await dock(page).getByRole("button", { name: "Show me what happens" }).click();
    await expect(dock(page).getByText("Spot on.")).toBeVisible();
    expect(errors).toEqual([]);
    expect(elsewhere).toEqual([]);
  });

  test("asks in plain words, then reads the camera over and over", async ({ page }) => {
    const { errors, elsewhere } = watch(page);
    await open(page);
    await page.getByRole("button", { name: "Use my camera" }).click();
    await expect(
      page.getByText("The picture is never sent anywhere or saved.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Yes, use my camera" }).click();
    await expect(page.getByText("The camera is on. Its picture stays on this device.")).toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await expect(page.getByLabel("Your camera picture, as the AI sees it")).toBeVisible();
    await expect.poll(() => reads(page), { timeout: 60_000 }).toBeGreaterThan(3);
    await expect(answer(page)).toHaveText(/^The AI says: /);
    // A smudge needs a still picture: the camera's picture becomes a snap.
    await page.getByRole("switch", { name: "Add a faint smudge" }).click();
    await expect(page.getByText("The camera is on.", { exact: false })).toHaveCount(0);
    await expect(answer(page)).toHaveText(/^(Before the smudge|It still says)/, {
      timeout: 60_000,
    });
    expect(errors).toEqual([]);
    expect(elsewhere).toEqual([]);
  });

  test("a refused camera leaves the photos working", async ({ page }) => {
    await refuseCamera(page);
    await open(page);
    await page.getByRole("button", { name: "Use my camera" }).click();
    await page.getByRole("button", { name: "Yes, use my camera" }).click();
    await expect(page.getByText("The camera is blocked, so use the photos instead.")).toBeVisible();
    await page.getByRole("radio", { name: "Teapot" }).click();
    await expect(answer(page)).toHaveText("The AI says: teapot.", { timeout: 60_000 });
  });

  test("saying no to the camera keeps the photo", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Use my camera" }).click();
    await page.getByRole("button", { name: "No thanks" }).click();
    await expect(page.getByRole("button", { name: "Use my camera" })).toBeVisible();
    await expect(answer(page)).toHaveText("The AI says: boxer.", { timeout: 60_000 });
  });

  test("a link opens on the same photo, layer and smudge", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page);
    await page.getByRole("radio", { name: "Teapot" }).click();
    await page.getByRole("radio", { name: "Middle: shapes" }).click();
    await page.getByRole("slider", { name: "How strong the smudge is" }).focus();
    await page.keyboard.press("End");
    await page.getByRole("button", { name: "Copy a link to this view" }).click();
    await expect(page.locator("[data-share]").getByText(/Link copied/)).toBeVisible();

    const fresh = await context.newPage();
    await fresh.goto(`/learn/how-machines-see${new URL(page.url()).hash}`);
    await expect(fresh.getByRole("radio", { name: "Teapot" })).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 20_000 },
    );
    await expect(fresh.getByRole("radio", { name: "Middle: shapes" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(fresh.getByRole("slider", { name: "How strong the smudge is" })).toHaveAttribute(
      "aria-valuenow",
      "8",
    );
  });

  test("says plainly when the picture reader cannot load, and tries again", async ({ page }) => {
    await page.route("**/models/mobilenet-v1-025-v1/model.json", (route) => route.abort());
    await open(page);
    await expect(page.getByText("The AI could not look at the picture.")).toBeVisible({
      timeout: 60_000,
    });
    await page.unroute("**/models/mobilenet-v1-025-v1/model.json");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(answer(page)).toHaveText("The AI says: boxer.", { timeout: 60_000 });
  });

  test("the camera's maps keep up at 15 a second or more", { tag: "@perf" }, async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Use my camera" }).click();
    await page.getByRole("button", { name: "Yes, use my camera" }).click();
    // Warm up: the model loads and the first pictures prepare the graphics chip.
    await expect.poll(() => reads(page), { timeout: 60_000 }).toBeGreaterThan(10);
    const before = await reads(page);
    const started = Date.now();
    await page.waitForTimeout(3000);
    const read = (await reads(page)) - before;
    const seconds = (Date.now() - started) / 1000;
    const msPerMap = (seconds * 1000) / Math.max(1, read);
    recordPerf({ read, seconds, msPerMap });
    // Every profile: the maps keep updating. The reference profile also holds 15 a second.
    expect(read, "camera pictures read in 3 s").toBeGreaterThan(0);
    budget("ms per camera map update", msPerMap, 1000 / 15);
  });
});
