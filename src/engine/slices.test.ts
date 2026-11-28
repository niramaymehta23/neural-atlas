import { createSlices } from "./slices";

const setUp = () => {
  const waiting: (() => void)[] = [];
  const slices = createSlices((next) => waiting.push(next));
  return { slices, run: () => waiting.splice(0).forEach((next) => next()) };
};

describe("slices of work", () => {
  it("holds the slice due next while the page is hidden, and runs it on return", () => {
    const { slices, run } = setUp();
    const slice = vi.fn();
    slices.next(slice);
    slices.rest(true);
    run();
    expect(slice).not.toHaveBeenCalled();
    slices.rest(false);
    run();
    expect(slice).toHaveBeenCalledTimes(1);
  });

  it("holds a slice asked for while the page is hidden", () => {
    const { slices, run } = setUp();
    const slice = vi.fn();
    slices.rest(true);
    slices.next(slice);
    run();
    expect(slice).not.toHaveBeenCalled();
    slices.rest(false);
    run();
    expect(slice).toHaveBeenCalledTimes(1);
  });

  it("runs a slice once however often the page is hidden and shown", () => {
    const { slices, run } = setUp();
    const slice = vi.fn();
    slices.next(slice);
    for (let times = 0; times < 5; times += 1) {
      slices.rest(true);
      slices.rest(false);
    }
    run();
    expect(slice).toHaveBeenCalledTimes(1);
  });

  it("has one slice due at most: a newer one takes its place", () => {
    const { slices, run } = setUp();
    const older = vi.fn();
    const newer = vi.fn();
    slices.next(older);
    slices.next(newer);
    run();
    expect(older).not.toHaveBeenCalled();
    expect(newer).toHaveBeenCalledTimes(1);
  });
});
