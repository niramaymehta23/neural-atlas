import type { Page } from "@playwright/test";

/** What a page did since the counts were last read. */
export type Work = {
  /** Animation frames the page asked for. */
  frames: number;
  timers: number;
  /** WebGL draw calls. */
  draws: number;
  /** Fills, strokes and words put on 2D canvases. */
  paints: number;
  /** Messages from workers: a worker that is training reports. */
  messages: number;
};

/**
 * Counts what the page does, from before its first script. `hide` makes the page believe its tab
 * is hidden (Playwright keeps every page visible), and leaves the browser's own brakes off: frames
 * and timers still run at full speed, so whatever stops, stops because the site stopped it.
 */
export async function countWork(page: Page) {
  await page.addInitScript(() => {
    const counted = { frames: 0, timers: 0, draws: 0, paints: 0, messages: 0 };
    let hidden = false;
    Object.assign(window, {
      workDone: () => {
        const since = { ...counted };
        for (const key of Object.keys(counted) as (keyof typeof counted)[]) counted[key] = 0;
        return since;
      },
      hideTab: (now: boolean) => {
        hidden = now;
        document.dispatchEvent(new Event("visibilitychange"));
      },
    });
    Object.defineProperty(document, "hidden", { get: () => hidden });
    Object.defineProperty(document, "visibilityState", {
      get: () => (hidden ? "hidden" : "visible"),
    });
    const { requestAnimationFrame: frame, setTimeout: later } = window;
    window.requestAnimationFrame = (run) =>
      frame((now) => {
        counted.frames += 1;
        run(now);
      });
    const timed = (run: TimerHandler, ms?: number, ...rest: unknown[]) =>
      later(
        (...given: unknown[]) => {
          counted.timers += 1;
          if (typeof run === "function") (run as (...all: unknown[]) => void)(...given);
        },
        ms,
        ...rest,
      );
    Object.assign(window, { setTimeout: timed });
    for (const gl of [WebGLRenderingContext, WebGL2RenderingContext])
      for (const name of ["drawArrays", "drawElements"] as const) {
        const draw = gl.prototype[name] as (...all: unknown[]) => void;
        Object.assign(gl.prototype, {
          [name](this: unknown, ...all: unknown[]) {
            counted.draws += 1;
            draw.apply(this, all);
          },
        });
      }
    for (const name of ["fillRect", "fill", "stroke", "fillText", "putImageData", "drawImage"]) {
      const canvas = CanvasRenderingContext2D.prototype as unknown as Record<
        string,
        (...all: unknown[]) => void
      >;
      const paint = canvas[name];
      if (!paint) continue;
      canvas[name] = function (this: unknown, ...all: unknown[]) {
        counted.paints += 1;
        paint.apply(this, all);
      };
    }
    const RealWorker = window.Worker;
    window.Worker = class extends RealWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", () => {
          counted.messages += 1;
        });
      }
    };
  });
}

type Counting = { workDone: () => Work; hideTab: (hidden: boolean) => void };

/** What the page does over the next `ms`. */
export async function workOver(page: Page, ms: number): Promise<Work> {
  await page.evaluate(() => (window as unknown as Counting).workDone());
  await page.waitForTimeout(ms);
  return page.evaluate(() => (window as unknown as Counting).workDone());
}

export const hideTab = (page: Page, hidden: boolean) =>
  page.evaluate((now) => (window as unknown as Counting).hideTab(now), hidden);

/** The things it is still doing that a page with nothing moving has no reason to do. */
export async function stillDoing(page: Page, ms = 1500): Promise<string> {
  const work = await workOver(page, ms);
  const seconds = ms / 1000;
  return Object.entries(work)
    .filter(([name, times]) => times > (name === "frames" || name === "timers" ? 2 * seconds : 0))
    .map(([name, times]) => `${times} ${name}`)
    .join(", ");
}
