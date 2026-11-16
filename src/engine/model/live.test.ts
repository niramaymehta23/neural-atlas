import { createLiveBuffer, readLive, writeLive } from "./live";

describe("live parameters", () => {
  it("round-trips a write and refuses a half-done one", () => {
    const buffer = createLiveBuffer(3);
    expect(readLive(buffer)).toBeNull();
    writeLive(buffer, 4, 0.25, Float64Array.of(1, -2, 3));
    expect(readLive(buffer)).toMatchObject({
      epoch: 4,
      loss: 0.25,
      params: Float64Array.of(1, -2, 3),
    });
    Atomics.add(new Int32Array(buffer, 0, 1), 0, 1);
    expect(readLive(buffer)).toBeNull();
  });
});
