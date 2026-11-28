/**
 * The one loop for pictures that move by themselves. It draws no more often than asked, and not
 * at all when nobody could see it: in a hidden tab, scrolled out of view, or (for a picture that
 * only breathes) once the learner has been away for a while. Waiting between drawings is a timer,
 * not an animation frame, so the browser is not woken up for frames that would draw nothing.
 */

/** Twenty drawings a second: plenty for a slow drift, where nothing moves a pixel between them. */
export const DRIFT_RATE = 20;
/** Thirty drawings a second: for things that travel, such as rain, flows and a field that learns. */
export const FLOW_RATE = 30;
/** After this long with no pointer, key or scroll, a picture that only breathes holds still. */
export const REST_MS = 20_000;

/** The timer aims this long before a drawing is due; the next animation frame then lands on it. */
const EARLY_MS = 12;
/** Drawings closer together than this are every animation frame: there is nothing to wait out. */
const SMOOTH_MS = 25;
/** A frame this close to when a drawing is due is the one to draw on. */
const EARLY_FRAME_MS = 6;
/** A picture moves on by no more than this at once (or one slow drawing's worth): it never jumps. */
const MOST_MS = 250;

const SIGNS_OF_LIFE = ["pointermove", "pointerdown", "keydown", "focusin", "scroll"] as const;

/** Calls `on` at every sign of the learner; returns a function that stops. */
export function onActivity(on: () => void): () => void {
  for (const name of SIGNS_OF_LIFE)
    window.addEventListener(name, on, { passive: true, capture: true });
  return () => {
    for (const name of SIGNS_OF_LIFE) window.removeEventListener(name, on, { capture: true });
  };
}

type DrawingLoopOptions = {
  /** Drawings a second, at most; asked again before each one, so a picture can change its pace. */
  rate: number | (() => number);
  /** Only draws while some of this is in view. */
  element?: Element | null;
  /** Holds still after the learner has been away this long, until they are back. */
  restAfter?: number;
};

/** Stops the loop for good; `wake` says there is something new to see, so a resting one carries on. */
export type DrawingLoop = (() => void) & { wake: () => void };

/**
 * Draws over and over, passing how many seconds of drawing have gone by since the last one.
 * Returns a function that stops it for good.
 */
export function drawingLoop(
  draw: (seconds: number) => void,
  { rate, element, restAfter = Infinity }: DrawingLoopOptions,
): DrawingLoop {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let last: number | null = null;
  let active = performance.now();
  let inView = true;
  let stopped = false;
  const every = () => 1000 / (typeof rate === "number" ? rate : rate());

  const awake = () =>
    !stopped && inView && !document.hidden && performance.now() - active <= restAfter;
  const step = (now: number) => {
    frame = 0;
    if (!awake()) {
      last = null;
      return;
    }
    // A fast screen has frames before the drawing is due.
    if (last !== null && now - last < every() - EARLY_FRAME_MS) return ask();
    const seconds =
      last === null ? 0 : Math.max(0, Math.min(now - last, Math.max(MOST_MS, every() * 2))) / 1000;
    last = now;
    draw(seconds);
    if (!awake()) last = null;
    else if (every() > SMOOTH_MS) timer = setTimeout(ask, every() - EARLY_MS);
    else ask();
  };
  const ask = () => {
    timer = undefined;
    frame = requestAnimationFrame(step);
  };
  const pause = () => {
    clearTimeout(timer);
    timer = undefined;
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  };
  /** Carries on if it was resting and now has reason to draw. */
  const resume = () => {
    if (!awake()) pause();
    else if (!frame && timer === undefined) ask();
  };

  const ending: (() => void)[] = [];
  document.addEventListener("visibilitychange", resume);
  ending.push(() => document.removeEventListener("visibilitychange", resume));
  const wake = () => {
    active = performance.now();
    resume();
  };
  if (Number.isFinite(restAfter)) ending.push(onActivity(wake));
  if (element && typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver((entries) => {
      inView = entries.at(-1)?.isIntersecting ?? true;
      resume();
    });
    observer.observe(element);
    ending.push(() => observer.disconnect());
  }
  resume();

  const stop = () => {
    stopped = true;
    pause();
    for (const end of ending) end();
  };
  return Object.assign(stop, { wake });
}
