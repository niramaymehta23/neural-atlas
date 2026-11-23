import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  pitchFor,
  playChime,
  playNote,
  soundConnection,
  soundStore,
  tenths,
  turnSoundOff,
  turnSoundOn,
} from "./sound";
import { SoundToggle } from "./SoundToggle";
import { Timeline } from "@/engine/timeline/timeline";
import type { TimelineFrame } from "@/platform/contract";
import { TimelineSound } from "./TimelineSound";
import { useSoundOf } from "./use-sound-of";

function fakeAudio() {
  const notes: number[] = [];
  const param = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  const audio = {
    currentTime: 0,
    state: "running",
    destination: {},
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createOscillator: () => {
      const node = {
        type: "",
        frequency: {
          set value(hertz: number) {
            notes.push(hertz);
          },
        },
        connect: (next: unknown) => next,
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      return node;
    },
    createGain: () => ({ gain: param, connect: vi.fn(), disconnect: vi.fn() }),
  };
  return { audio, notes };
}

let fake = fakeAudio();
const create = vi.fn(() => fake.audio as unknown as AudioContext);
beforeEach(() => {
  fake = fakeAudio();
  create.mockClear();
  soundConnection.create = create;
});
afterEach(() => turnSoundOff());

describe("the sound of learning", () => {
  it("makes no audio until the switch is turned on, and closes it when turned off", () => {
    render(<SoundToggle />);
    playNote(0.5);
    playChime();
    expect(create).not.toHaveBeenCalled();
    const toggle = screen.getByRole("switch", { name: "Hear it learn" });
    fireEvent.click(toggle);
    expect(create).toHaveBeenCalledTimes(1);
    expect(soundStore.getState().on).toBe(true);
    fireEvent.click(toggle);
    expect(fake.audio.close).toHaveBeenCalled();
    expect(soundStore.getState().on).toBe(false);
  });

  it("says so where sound cannot play", () => {
    soundConnection.create = () => {
      throw new Error("no audio");
    };
    render(<SoundToggle />);
    fireEvent.click(screen.getByRole("switch", { name: "Hear it learn" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/can’t play sound/);
    expect(soundStore.getState().on).toBe(false);
  });

  it("falls as the mistakes shrink, and stays within its notes whatever it is given", () => {
    const pitches = [1, 0.8, 0.5, 0.2, 0].map(pitchFor);
    expect(pitches).toEqual([...pitches].sort((a, b) => b - a));
    expect(pitchFor(NaN)).toBe(pitchFor(1));
    expect(pitchFor(-4)).toBe(pitchFor(0));
    expect(pitchFor(40)).toBe(pitchFor(1));
    expect([tenths(0.3), tenths(0.999), tenths(1), tenths(NaN)]).toEqual([3, 9, 10, 0]);
  });

  it("plays no more notes a second than an ear can follow", () => {
    turnSoundOn();
    for (let note = 0; note < 100; note += 1) playNote(0.5);
    expect(fake.notes).toHaveLength(1);
    fake.audio.currentTime = 1;
    playNote(0.5);
    expect(fake.notes).toHaveLength(2);
  });

  it("saves nothing up while the page is hidden", () => {
    turnSoundOn();
    fake.audio.state = "suspended";
    playNote(0.5);
    playChime();
    playChime();
    expect(fake.notes).toEqual([]);
    fake.audio.state = "running";
    playChime();
    expect(fake.notes).toHaveLength(2);
  });

  it("plays a note for each new moment and a chime for each tenth gained, and falls silent on leaving", () => {
    const Learner = ({ step, off, right }: { step: number; off: number; right: number }) => {
      useSoundOf({ step, off, right }, true);
      return null;
    };
    turnSoundOn();
    const { rerender, unmount } = render(<Learner step={0} off={1} right={0.5} />);
    fake.notes.length = 0;
    fake.audio.currentTime = 1;
    rerender(<Learner step={1} off={0.8} right={0.55} />);
    expect(fake.notes).toHaveLength(1);
    fake.audio.currentTime = 2;
    rerender(<Learner step={2} off={0.5} right={0.75} />);
    // A note, and the chime's two.
    expect(fake.notes).toHaveLength(4);
    unmount();
    expect(fake.audio.close).toHaveBeenCalled();
  });

  it("goes quiet while the page is hidden", () => {
    turnSoundOn();
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fake.audio.suspend).toHaveBeenCalled();
    visibility.mockRestore();
  });
});

describe("the sound of a lesson", () => {
  it("is silent until asked for, then follows the training moment by moment", () => {
    const timeline = new Timeline<TimelineFrame>();
    const { unmount } = render(<TimelineSound timeline={timeline} />);
    act(() => timeline.record({ epoch: 0, loss: 2 }));
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("switch", { name: "Hear it learn" }));
    const heard: number[] = [];
    [1.9, 1, 0.2].forEach((loss, at) => {
      fake.audio.currentTime += 1;
      fake.notes.length = 0;
      act(() => timeline.record({ epoch: at + 1, loss }));
      heard.push(fake.notes[0] ?? 0);
    });
    expect(heard).toEqual([...heard].sort((a, b) => b - a));
    expect(heard[0]).toBe(pitchFor(0.95));
    // The last step was far better: its note, and the chime's two.
    expect(fake.notes).toHaveLength(3);
    // A moment without a number is silence, not a screech.
    fake.notes.length = 0;
    fake.audio.currentTime += 1;
    act(() => timeline.record({ epoch: 9, loss: Infinity }));
    expect(fake.notes).toEqual([]);
    unmount();
    expect(fake.audio.close).toHaveBeenCalled();
  });
});
