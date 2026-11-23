/**
 * Learning as sound: a soft note whose pitch follows how far off the learner is, and a chime each
 * time it gets another tenth of the answers right. There is no audio at all until the learner
 * asks for it: the audio context is made inside their tap, and closed again when they turn it off.
 */
import { createStore } from "zustand/vanilla";

/** How the sound reaches the speakers; tests swap it. */
export const soundConnection = {
  create: (): AudioContext => new AudioContext(),
};

/** A five-note scale over two and a bit octaves: any two notes of it sound well together. */
const SCALE = [0, 2, 4, 7, 9];
const LOWEST = 196;
const NOTES = 13;
/** Notes a second at most, however fast it learns. */
const MOST_A_SECOND = 8;
const LOUDNESS = 0.06;
const CHIME_LOUDNESS = 0.08;

/** The note for being this far off, 0 (spot on: the lowest, calmest) to 1 (the highest). */
export function pitchFor(off: number): number {
  const share = Number.isFinite(off) ? Math.min(1, Math.max(0, off)) : 1;
  const step = Math.round(share * (NOTES - 1));
  const octave = Math.floor(step / SCALE.length);
  return LOWEST * 2 ** (octave + (SCALE[step % SCALE.length] ?? 0) / 12);
}

/** Tenths of the answers right: a chime rings when this goes up. */
export const tenths = (right: number) =>
  Math.floor((Number.isFinite(right) ? Math.min(1, Math.max(0, right)) : 0) * 10 + 1e-9);

export type SoundState = { on: boolean; failed: boolean };
export const soundStore = createStore<SoundState>(() => ({ on: false, failed: false }));

let context: AudioContext | null = null;
let lastNote = -Infinity;

/** The sound follows the page: a hidden page falls silent. */
function followVisibility() {
  if (!context) return;
  void (document.visibilityState === "hidden" ? context.suspend() : context.resume());
}

/** Called from a tap, where browsers allow sound to start. */
export function turnSoundOn(): void {
  if (context) return;
  try {
    context = soundConnection.create();
    void context.resume();
  } catch {
    context = null;
    soundStore.setState({ on: false, failed: true });
    return;
  }
  lastNote = -Infinity;
  document.addEventListener("visibilitychange", followVisibility);
  soundStore.setState({ on: true, failed: false });
}

export function turnSoundOff(): void {
  document.removeEventListener("visibilitychange", followVisibility);
  const closing = context;
  context = null;
  soundStore.setState({ on: false, failed: false });
  void closing?.close().catch(() => undefined);
}

function ring(frequency: number, loudness: number, seconds: number, delay = 0) {
  if (!context || context.state === "closed") return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  // A soft start and a long soft end: never a click, never loud.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(loudness, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

/** A note for being this far off; notes that come too fast are skipped. */
export function playNote(off: number): void {
  if (!context) return;
  const now = context.currentTime;
  if (now - lastNote < 1 / MOST_A_SECOND) return;
  lastNote = now;
  ring(pitchFor(off), LOUDNESS, 0.35);
}

/** Two rising notes: it got noticeably better. */
export function playChime(): void {
  ring(LOWEST * 4, CHIME_LOUDNESS, 0.5);
  ring(LOWEST * 6, CHIME_LOUDNESS, 0.7, 0.09);
}
