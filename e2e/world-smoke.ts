import { expect, test } from "@playwright/test";
import type { WorldEntry } from "../src/platform/contract";
import { gpuTagFor } from "./gpu";
import { watch } from "./watch";

/**
 * The smoke test every built lesson of a world passes: it opens on its own story with the
 * dials, mission and guess in place, the real name held back, nothing sent elsewhere and no
 * errors; and at phone width nothing spills sideways. Each lesson's own spec
 * (e2e/w<world>-<id>.spec.ts) covers its interaction, mission and link.
 */
export function smokeWorld(world: WorldEntry, folder: string) {
  for (const lesson of world.lessons.filter(({ load }) => load)) {
    const tag = gpuTagFor(`/learn/${lesson.id}`);
    test(
      `${lesson.title} opens on its story, with the real name kept back`,
      { tag },
      async ({ page }) => {
        const { errors, elsewhere } = watch(page);
        const { captions } = (await import(`../src/modules/${folder}/${lesson.id}/captions`)) as {
          captions: { opening: string };
        };
        await page.goto(`/learn/${lesson.id}`);
        await expect(page.getByRole("heading", { name: lesson.title, level: 1 })).toBeVisible();
        await expect(page.getByText(captions.opening)).toBeVisible();
        await expect(
          page.locator("[data-region=dock]").getByRole("region", { name: "Mission" }),
        ).toBeVisible();
        await expect(page.getByRole("region", { name: "Make a guess" })).toBeVisible();
        await expect(page.getByText(lesson.realTerm, { exact: true })).toHaveCount(0);
        await expect(page.getByText("Something went wrong here")).toHaveCount(0);
        await page.waitForLoadState("networkidle");
        expect(errors).toEqual([]);
        expect(elsewhere).toEqual([]);
      },
    );

    test(`${lesson.title} fits a phone without spilling sideways`, { tag }, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(`/learn/${lesson.id}`);
      await expect(page.locator("[data-region=scene]")).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        320,
      );
    });
  }
}
