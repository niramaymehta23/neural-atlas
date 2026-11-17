import { FLOAT_FRAME_MS, FLOAT_IDLE_MS, startFloating } from "./floating";

describe("startFloating", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("draws about 30 frames a second, then stops after 20 s without a pointer", () => {
    const invalidate = vi.fn();
    const stop = startFloating(invalidate);
    vi.advanceTimersByTime(1000);
    expect(invalidate.mock.calls.length).toBeGreaterThanOrEqual(28);
    expect(invalidate.mock.calls.length).toBeLessThanOrEqual(31);

    vi.advanceTimersByTime(FLOAT_IDLE_MS + 4000);
    const idle = invalidate.mock.calls.length;
    vi.advanceTimersByTime(5000);
    expect(invalidate.mock.calls.length).toBe(idle);

    window.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(FLOAT_FRAME_MS * 3);
    expect(invalidate.mock.calls.length).toBeGreaterThan(idle);
    stop();
  });

  it("draws nothing while the tab is hidden", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const invalidate = vi.fn();
    const stop = startFloating(invalidate);
    vi.advanceTimersByTime(1000);
    expect(invalidate).not.toHaveBeenCalled();
    stop();
    hidden.mockRestore();
  });

  it("stops for good when the map goes away", () => {
    const invalidate = vi.fn();
    startFloating(invalidate)();
    vi.advanceTimersByTime(1000);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
