import { act, renderHook } from "@testing-library/react";
import { useWalk } from "./use-walk";

const walked = (first: readonly number[] | null) =>
  renderHook(({ walk }: { walk: readonly number[] | null }) => useWalk(walk, 0), {
    initialProps: { walk: first },
  });
/** One step's time, `times` times over: each step asks for the next. */
const pass = (times: number) => {
  for (let at = 0; at < times; at += 1) act(() => vi.advanceTimersByTime(160));
};

describe("the piece's walk", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stands at the start with nothing to walk, and waits for nothing", () => {
    const { result } = walked(null);
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("walks a try square by square, then rests: no timer is left running", () => {
    const { result } = walked([0, 1, 2]);
    pass(1);
    expect(result.current).toBe(0);
    pass(1);
    expect(result.current).toBe(1);
    pass(1);
    expect(result.current).toBe(2);
    pass(6);
    expect(result.current).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("finishes the try it is on before taking up the newest, however many came in", () => {
    const { result, rerender } = walked([0, 1, 2]);
    pass(2);
    rerender({ walk: [0, 5] });
    rerender({ walk: [0, 7, 8] });
    expect(result.current).toBe(1);
    pass(1);
    expect(result.current).toBe(2);
    pass(2);
    expect(result.current).toBe(7);
    pass(1);
    expect(result.current).toBe(8);
    expect(vi.getTimerCount()).toBe(0);
  });
});
