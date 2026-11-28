import { DRIFT_RATE, REST_MS } from "@/design/drawing-loop";
import { LEAN_RATE, createDrifting, startFloating } from "./floating";

describe("startFloating", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("draws rarely while the map drifts, more often while it leans, and rests after 20 s", () => {
    const drifting = createDrifting();
    const invalidate = vi.fn();
    const stop = startFloating(drifting, invalidate);
    vi.advanceTimersByTime(1000);
    expect(invalidate.mock.calls.length).toBeGreaterThan(DRIFT_RATE / 2);
    expect(invalidate.mock.calls.length).toBeLessThanOrEqual(DRIFT_RATE + 2);
    expect(drifting.seconds()).toBeGreaterThan(0.8);
    expect(drifting.seconds()).toBeLessThanOrEqual(1);

    invalidate.mockClear();
    drifting.lean(true);
    vi.advanceTimersByTime(1000);
    expect(invalidate.mock.calls.length).toBeGreaterThan(DRIFT_RATE);
    expect(invalidate.mock.calls.length).toBeLessThanOrEqual(LEAN_RATE + 2);

    vi.advanceTimersByTime(REST_MS);
    invalidate.mockClear();
    const seconds = drifting.seconds();
    vi.advanceTimersByTime(5000);
    expect(invalidate).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(200);
    expect(invalidate).toHaveBeenCalled();
    // The drift carries on from where it rested.
    expect(drifting.seconds() - seconds).toBeLessThanOrEqual(0.25);
    stop();
  });

  it("draws nothing while the tab is hidden", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const invalidate = vi.fn();
    const stop = startFloating(createDrifting(), invalidate);
    vi.advanceTimersByTime(1000);
    expect(invalidate).not.toHaveBeenCalled();
    stop();
    hidden.mockRestore();
  });

  it("stops for good when the map goes away", () => {
    const invalidate = vi.fn();
    startFloating(createDrifting(), invalidate)();
    vi.advanceTimersByTime(1000);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
