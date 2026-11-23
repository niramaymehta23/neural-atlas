import { test as base, type BrowserContext, type Page } from "@playwright/test";

/**
 * World 6's browser tests. `test` is Playwright's, plus one thing: with `E2E_CPU_THROTTLE=4`
 * every page runs on a CPU slowed four times through CDP (`Emulation.setCPUThrottlingRate`),
 * which is how these specs are checked against GitHub's slower runners before a stage is done.
 * Contexts a test opens itself (touch, reduced motion) go through `slowed(context)`.
 * The shared steps (open, turn a dial, the star, a link) are World 5's, in `e2e/w5.ts`.
 */
export { attributeOf, dialSays, dock, linkKeeps, open, starred, textOf, turn } from "./w5";
export type { Reader } from "./w5";

const RATE = Number(process.env.E2E_CPU_THROTTLE ?? 0);

async function slow(page: Page) {
  if (RATE <= 1) return;
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: RATE });
}

/** Slows every page of `context`, now and later, when a throttled run is asked for. */
export async function slowed(context: BrowserContext) {
  if (RATE <= 1) return context;
  for (const page of context.pages()) await slow(page);
  context.on("page", (page) => void slow(page));
  return context;
}

export const test = base.extend<{ throttle: void }>({
  throttle: [
    async ({ context }, use) => {
      await slowed(context);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
