import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type * as Catalog from "@/catalog";
import { lessonById } from "@/catalog";
import { labConnection, type LabPort } from "@/engine/lab/lab-client";
import type { LabConfig } from "@/engine/lab/lab-run";
import { inProcessLab } from "@/engine/lab/testing/in-process-lab";
import { LessonStage } from "./LessonStage";
import { useLab } from "./use-lab";

vi.mock("@/catalog", async (original) => {
  const catalog = await original<typeof Catalog>();
  return { ...catalog, lessonById: vi.fn(catalog.lessonById) };
});

const WAIT = { timeout: 10_000 };
const LIMIT = 30_000;

describe("a lesson's scene inside another page", () => {
  it(
    "plays the lesson's own scene and dials, with a way to the whole lesson",
    async () => {
      render(<LessonStage id="safe-vs-adventurous" />);
      const [slider] = await screen.findAllByRole("slider", undefined, WAIT);
      expect(screen.getByRole("link", { name: /Open the whole lesson/ })).toHaveAttribute(
        "href",
        "/learn/safe-vs-adventurous",
      );
      const before = slider?.getAttribute("aria-valuenow");
      fireEvent.keyDown(slider as HTMLElement, { key: "ArrowRight" });
      expect(screen.getAllByRole("slider")[0]?.getAttribute("aria-valuenow")).not.toBe(before);
    },
    LIMIT,
  );

  it(
    "says so when the lesson cannot be fetched, and tries again",
    async () => {
      const real = lessonById("rolling-downhill");
      if (!real?.load) throw new Error("no lesson");
      const load = vi.fn(real.load).mockRejectedValueOnce(new Error("offline"));
      vi.mocked(lessonById).mockReturnValue({ ...real, load } as typeof real);
      render(<LessonStage id="rolling-downhill" />);
      expect(await screen.findByRole("alert", undefined, WAIT)).toHaveTextContent(/couldn’t load/);
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), WAIT);
      await screen.findByRole("link", { name: /Open the whole lesson/ }, WAIT);
    },
    LIMIT,
  );
});

describe("practising in the lab's worker", () => {
  const config: LabConfig = {
    kind: "garden",
    model: "line",
    dots: [
      { x: -0.5, y: 0, label: 0 },
      { x: 0.5, y: 0, label: 1 },
    ],
    fresh: [{ x: 0.4, y: 0, label: 1 }],
    spots: new Float32Array([0, 0]),
    seed: 1,
  };
  const real = labConnection.connect;
  afterEach(() => {
    labConnection.connect = real;
  });

  it(
    "gives a new run a new worker when the last one died, even before there was a run",
    async () => {
      const dead: LabPort = { postMessage: vi.fn(), onmessage: null, terminate: vi.fn() };
      labConnection.connect = () => dead;
      const still = () => undefined;
      const { result, rerender } = renderHook(
        ({ now, key }: { now: LabConfig | null; key: string }) =>
          useLab({
            config: now,
            runKey: key,
            steps: 0,
            running: false,
            most: 10,
            perSecond: 5,
            onStep: still,
            onFinished: still,
          }),
        { initialProps: { now: null as LabConfig | null, key: "" } },
      );
      act(() => dead.onerror?.());
      expect(result.current.failure).not.toBeNull();
      labConnection.connect = inProcessLab;
      rerender({ now: config, key: "one" });
      expect(dead.terminate).toHaveBeenCalled();
      await vi.waitFor(() => expect(result.current.moment).not.toBeNull(), WAIT);
      expect(result.current.failure).toBeNull();
    },
    LIMIT,
  );

  it(
    "never shows a run that is over as the next one, though it is called the same",
    async () => {
      labConnection.connect = inProcessLab;
      const seen: (number | null)[] = [];
      const still = () => undefined;
      const { rerender } = renderHook(
        ({ now, steps }: { now: LabConfig | null; steps: number }) => {
          const lab = useLab({
            config: now,
            runKey: now ? "same" : "",
            steps,
            running: false,
            most: 10,
            perSecond: 5,
            onStep: still,
            onFinished: still,
          });
          seen.push(lab.moment?.step ?? null);
          return lab;
        },
        { initialProps: { now: config as LabConfig | null, steps: 10 } },
      );
      await vi.waitFor(() => expect(seen.at(-1)).toBe(10), WAIT);
      rerender({ now: null, steps: 0 });
      expect(seen.at(-1)).toBeNull();
      seen.length = 0;
      rerender({ now: config, steps: 0 });
      await vi.waitFor(() => expect(seen.at(-1)).toBe(0), WAIT);
      expect(seen).not.toContain(10);
    },
    LIMIT,
  );

  it(
    "stops a run whose setting went away, steps on their way and all",
    async () => {
      labConnection.connect = inProcessLab;
      const onStep = vi.fn();
      const still = () => undefined;
      const { rerender } = renderHook(
        ({ now }: { now: LabConfig | null }) =>
          useLab({
            config: now,
            runKey: now ? "one" : "none",
            steps: 0,
            running: now !== null,
            most: 10,
            perSecond: 50,
            onStep,
            onFinished: still,
          }),
        { initialProps: { now: config as LabConfig | null } },
      );
      await vi.waitFor(() => expect(onStep).toHaveBeenCalled(), WAIT);
      rerender({ now: null });
      onStep.mockClear();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(onStep).not.toHaveBeenCalled();
    },
    LIMIT,
  );
});
