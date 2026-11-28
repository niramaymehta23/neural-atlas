import { onTabHidden } from "./tab";
import { PracticeClient, type PracticePort } from "./practice/client";

const show = (hidden: boolean) => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(hidden);
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("a tab that is hidden", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is told to whoever asks, until they stop", () => {
    const change = vi.fn();
    const stop = onTabHidden(change);
    expect(change).not.toHaveBeenCalled();
    show(true);
    show(false);
    stop();
    show(true);
    expect(change.mock.calls).toEqual([[true], [false]]);
  });

  it("is told at once when it is hidden already", () => {
    show(true);
    const change = vi.fn();
    onTabHidden(change)();
    expect(change.mock.calls).toEqual([[true]]);
  });

  it("rests the worker, and a closed one hears nothing more", () => {
    const postMessage = vi.fn();
    const port: PracticePort<null, object> = { postMessage, onmessage: null, terminate: vi.fn() };
    const client = new PracticeClient<null, object>(() => port, {
      onMoment: () => undefined,
      onError: () => undefined,
    });
    show(true);
    show(false);
    client.dispose();
    show(true);
    expect(postMessage.mock.calls).toEqual([
      [{ type: "rest", resting: true }],
      [{ type: "rest", resting: false }],
    ]);
  });
});
