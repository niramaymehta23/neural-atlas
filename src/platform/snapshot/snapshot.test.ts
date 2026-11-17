// @vitest-environment node
import type { LessonModule } from "../contract";
import {
  decodeSnapshot,
  encodeSnapshot,
  hashFor,
  MAX_LINK_CHARS,
  snapshotFromHash,
  SNAPSHOT_VERSION,
} from "./snapshot";

const initialState = { step: 0.1, points: [] as number[][], label: "calm" };
const predictions = [
  {
    id: "where-it-stops",
    question: "Where?",
    choices: [
      { id: "settles", label: "Settles" },
      { id: "flies-off", label: "Flies off" },
    ],
    answer: () => null,
  },
] as unknown as LessonModule["predictions"];
const lesson = { initialState, predictions };
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
  momentEpoch: 41,
};

/** A link body from raw JSON text, as a hand-made link could hold it. */
async function rawLink(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return Buffer.from(bytes).toString("base64url");
}

/** Encodes any JSON as a link body, for hand-made links. */
async function linkOf(json: unknown) {
  return encodeSnapshot(json as Parameters<typeof encodeSnapshot>[0]);
}

describe("snapshot links", () => {
  it("round-trips the exact view through a compact URL hash", async () => {
    const encoded = await encodeSnapshot(view);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    const hash = hashFor(encoded);
    const decoded = await decodeSnapshot(snapshotFromHash(hash) ?? "", view.id, lesson);
    expect(decoded).toEqual({ ok: true, snapshot: { v: SNAPSHOT_VERSION, ...view } });
  });

  it("compresses repetitive state", async () => {
    const big = {
      ...view,
      state: { ...view.state, points: Array.from({ length: 200 }, () => [0.5, 0.5]) },
    };
    expect((await encodeSnapshot(big)).length).toBeLessThan(JSON.stringify(big).length / 4);
  });

  it("says why it cannot open another lesson, an unknown version, garbage or a huge link (PLT-13)", async () => {
    const other = await decodeSnapshot(await encodeSnapshot(view), "other", lesson);
    expect(other).toEqual({ ok: false, reason: "lesson" });
    expect(await decodeSnapshot("not-a-snapshot", view.id, lesson)).toEqual({
      ok: false,
      reason: "broken",
    });
    const future = await linkOf({ ...view, v: 3 });
    expect(await decodeSnapshot(future, view.id, lesson)).toEqual({
      ok: false,
      reason: "version",
    });
    const huge = "A".repeat(MAX_LINK_CHARS + 1);
    expect(await decodeSnapshot(huge, view.id, lesson)).toEqual({ ok: false, reason: "size" });
  });

  it("still opens a version 1 link, keeping its moment as a position", async () => {
    const old = await linkOf({ ...view, v: 1, momentEpoch: undefined, moment: 7 });
    const decoded = await decodeSnapshot(old, view.id, lesson);
    expect(decoded).toMatchObject({ ok: true, snapshot: { momentEpoch: null, momentIndex: 7 } });
  });

  it("keeps only known keys of the right kind and finite numbers", async () => {
    const odd = await rawLink(
      `{"v":2,"id":"${view.id}","state":{"step":"huge","points":[[1,1e999]],"extra":true},"guesses":{},"touched":true,"momentEpoch":1.5}`,
    );
    expect(await decodeSnapshot(odd, view.id, lesson)).toMatchObject({
      ok: true,
      snapshot: { state: { step: 0.1, points: [], label: "calm" }, momentEpoch: null },
    });
  });

  it("runs the lesson's parseState to clamp what the scene draws (PLT-02)", async () => {
    const wild = await linkOf({ ...view, v: SNAPSHOT_VERSION, state: { step: 100000 } });
    const parseState = (saved: typeof initialState) => ({
      ...saved,
      step: Math.min(1, Math.max(0, saved.step)),
    });
    const decoded = await decodeSnapshot(wild, view.id, {
      ...lesson,
      parseState: parseState as unknown as LessonModule["parseState"],
    });
    expect(decoded).toMatchObject({ ok: true, snapshot: { state: { step: 1 } } });
  });

  it("keeps only guesses for known predictions and choices, revealed ones with an answer (PLT-26)", async () => {
    const link = await linkOf({
      ...view,
      v: SNAPSHOT_VERSION,
      guesses: {
        "where-it-stops": { choice: "settles", revealed: true },
        unknown: { choice: "settles", revealed: false },
      },
    });
    const decoded = await decodeSnapshot(link, view.id, lesson);
    expect(decoded).toMatchObject({ ok: true, snapshot: { guesses: {} } });
    const madeUp = await linkOf({
      ...view,
      v: SNAPSHOT_VERSION,
      guesses: { "where-it-stops": { choice: "teleports", revealed: false } },
    });
    expect(await decodeSnapshot(madeUp, view.id, lesson)).toMatchObject({
      snapshot: { guesses: {} },
    });
  });

  it("finds the snapshot among other hash values", () => {
    expect(snapshotFromHash("#x=1&s=abc")).toBe("abc");
    expect(snapshotFromHash("")).toBeNull();
  });
});
