// @vitest-environment node
import {
  decodeSnapshot,
  encodeSnapshot,
  hashFor,
  snapshotFromHash,
  SNAPSHOT_VERSION,
} from "./snapshot";

const initialState = { step: 0.1, points: [] as number[][], label: "calm" };
const view = {
  id: "rolling-downhill",
  state: {
    step: 0.85,
    points: [
      [0.1, -0.4],
      [0.25, 0.5],
    ],
    label: "wild",
  },
  guesses: { "where-it-stops": { choice: "settles", revealed: true, answer: "flies-off" } },
  touched: true,
  moment: 41,
};

describe("snapshot links", () => {
  it("round-trips the exact view through a compact URL hash", async () => {
    const encoded = await encodeSnapshot(view);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    const hash = hashFor(encoded);
    const decoded = await decodeSnapshot(snapshotFromHash(hash) ?? "", view.id, initialState);
    expect(decoded).toEqual({ v: SNAPSHOT_VERSION, ...view });
  });

  it("compresses repetitive state", async () => {
    const big = {
      ...view,
      state: { ...view.state, points: Array.from({ length: 200 }, () => [0.5, 0.5]) },
    };
    expect((await encodeSnapshot(big)).length).toBeLessThan(JSON.stringify(big).length / 4);
  });

  it("rejects another lesson, an unknown version and garbage", async () => {
    expect(await decodeSnapshot(await encodeSnapshot(view), "other", initialState)).toBeNull();
    expect(await decodeSnapshot("not-a-snapshot", view.id, initialState)).toBeNull();
    const future = await encodeSnapshot({ ...view, v: 2 } as never);
    expect(await decodeSnapshot(future, view.id, initialState)).toBeNull();
  });

  it("keeps only known keys of the right kind and well-formed guesses", async () => {
    const odd = await encodeSnapshot({
      ...view,
      state: { step: "huge", points: [[1, 1]], extra: true } as never,
      guesses: { good: { choice: "a", revealed: false }, bad: { choice: 3 } } as never,
      moment: 1.5,
    });
    expect(await decodeSnapshot(odd, view.id, initialState)).toMatchObject({
      state: { step: 0.1, points: [[1, 1]], label: "calm" },
      guesses: { good: { choice: "a", revealed: false } },
      moment: null,
    });
  });

  it("refuses an oversized link", async () => {
    expect(await decodeSnapshot("A".repeat(40_000), view.id, initialState)).toBeNull();
  });

  it("finds the snapshot among other hash values", () => {
    expect(snapshotFromHash("#x=1&s=abc")).toBe("abc");
    expect(snapshotFromHash("")).toBeNull();
  });
});
