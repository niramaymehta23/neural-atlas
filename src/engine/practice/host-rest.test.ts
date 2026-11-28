import { createPracticeHost } from "./host";
import type { PracticeEvent } from "./protocol";

type Moment = { at: number };

/** A host on a clock the test moves: each wait is taken in turn, and nothing runs by itself. */
const setUp = () => {
  let time = 0;
  const waiting: { next: () => void; at: number }[] = [];
  const events: PracticeEvent<Moment>[] = [];
  let step = 0;
  const handle = createPracticeHost<null, Moment>(
    () => ({
      get step() {
        return step;
      },
      advance: () => {
        step += 1;
      },
      moment: () => ({ at: step }),
      every: 1,
    }),
    (event) => events.push(event),
    (next, wait) => waiting.push({ next, at: time + wait }),
    () => time,
  );
  const pass = (ms: number) => {
    const end = time + ms;
    for (;;) {
      const due = waiting.findIndex(({ at }) => at <= end);
      if (due < 0) break;
      const [first] = waiting.splice(due, 1);
      time = Math.max(time, first?.at ?? time);
      first?.next();
    }
    time = end;
  };
  handle({ type: "start", run: 1, config: null });
  return { handle, pass, events, steps: () => step, waiting };
};

describe("practice while the page is hidden", () => {
  it("holds still with nothing waiting to run, then keeps its pace without rushing", () => {
    const { handle, pass, steps } = setUp();
    handle({ type: "go", run: 1, until: 1000, perSecond: 10 });
    pass(1000);
    const before = steps();
    expect(before).toBeGreaterThanOrEqual(9);
    handle({ type: "rest", resting: true });
    pass(60_000);
    expect(steps()).toBe(before);
    handle({ type: "rest", resting: false });
    pass(1000);
    expect(steps() - before).toBeGreaterThanOrEqual(8);
    expect(steps() - before).toBeLessThanOrEqual(11);
  });

  it("hears a pause and a new start while it holds still", () => {
    const { handle, pass, steps, events } = setUp();
    handle({ type: "go", run: 1, until: 1000, perSecond: 10 });
    pass(500);
    handle({ type: "rest", resting: true });
    handle({ type: "pause", run: 1 });
    expect(events.at(-1)).toMatchObject({ type: "stopped", step: steps() });
    const paused = steps();
    handle({ type: "rest", resting: false });
    pass(5000);
    expect(steps()).toBe(paused);
  });

  it("never runs two lots of work after a quick pause and start", () => {
    const { handle, pass, steps } = setUp();
    for (let times = 0; times < 5; times += 1) {
      handle({ type: "go", run: 1, until: 10_000, perSecond: 100 });
      handle({ type: "pause", run: 1 });
    }
    handle({ type: "go", run: 1, until: 10_000, perSecond: 100 });
    pass(1000);
    expect(steps()).toBeLessThanOrEqual(101);
  });
});
