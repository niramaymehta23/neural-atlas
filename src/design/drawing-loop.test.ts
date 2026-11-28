import { drawingLoop, REST_MS } from "./drawing-loop";

describe("drawingLoop", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([20, 30])("draws no more than %i times a second, at that pace", (rate) => {
    const draw = vi.fn();
    const stop = drawingLoop(draw, { rate });
    vi.advanceTimersByTime(2000);
    expect(draw.mock.calls.length).toBeLessThanOrEqual(rate * 2.2);
    expect(draw.mock.calls.length).toBeGreaterThan(rate * 1.5);
    stop();
  });

  it("draws every animation frame when asked for sixty a second", () => {
    const draw = vi.fn();
    const stop = drawingLoop(draw, { rate: 60 });
    vi.advanceTimersByTime(1000);
    expect(draw.mock.calls.length).toBeGreaterThan(55);
    stop();
  });

  it("leaves no timer or frame waiting while hidden, and carries on without a jump", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const draw = vi.fn();
    const stop = drawingLoop(draw, { rate: 20 });
    vi.advanceTimersByTime(500);
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
    draw.mockClear();
    vi.advanceTimersByTime(60_000);
    expect(draw).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(100);
    expect(draw.mock.calls[0]).toEqual([0]);
    stop();
  });

  it("leaves nothing waiting once the learner has been away, until they are back", () => {
    const draw = vi.fn();
    const stop = drawingLoop(draw, { rate: 20, restAfter: REST_MS });
    vi.advanceTimersByTime(REST_MS + 200);
    expect(vi.getTimerCount()).toBe(0);
    draw.mockClear();
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(200);
    expect(draw).toHaveBeenCalled();
    // Something new to see wakes it just as well.
    vi.advanceTimersByTime(REST_MS + 200);
    expect(vi.getTimerCount()).toBe(0);
    draw.mockClear();
    stop.wake();
    vi.advanceTimersByTime(200);
    expect(draw).toHaveBeenCalled();
    stop();
    stop.wake();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("draws only while its picture is in view", () => {
    let tell: (entries: { isIntersecting: boolean }[]) => void = () => undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(on: typeof tell) {
          tell = on;
        }
        observe = () => undefined;
        disconnect = () => undefined;
      },
    );
    const draw = vi.fn();
    const stop = drawingLoop(draw, { rate: 20, element: document.body });
    vi.advanceTimersByTime(200);
    tell([{ isIntersecting: false }]);
    expect(vi.getTimerCount()).toBe(0);
    draw.mockClear();
    vi.advanceTimersByTime(1000);
    expect(draw).not.toHaveBeenCalled();
    tell([{ isIntersecting: true }]);
    vi.advanceTimersByTime(200);
    expect(draw).toHaveBeenCalled();
    stop();
  });

  it("stops for good, even from inside a drawing", () => {
    const stops: (() => void)[] = [];
    const draw = vi.fn(() => stops[0]?.());
    stops.push(drawingLoop(draw, { rate: 30 }));
    vi.advanceTimersByTime(1000);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
