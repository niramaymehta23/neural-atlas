/**
 * Training, recorded like video: a ring buffer of snapshots you can play, pause, scrub and step,
 * plus a "ghost" (the previous run, frozen) read at the same epoch so both play in sync.
 * Pure state; the caller drives `tick` from its frame loop.
 */
export type Frame = { epoch: number };

export type TimelineState = {
  /** Index of the shown frame among the kept frames (oldest is 0). */
  cursor: number;
  length: number;
  playing: boolean;
  /** Following new frames as they arrive. */
  live: boolean;
  hasGhost: boolean;
  /** Counts runs: `newRun` bumps it, so a moment saved in one run is never looked up in another. */
  run: number;
};

export type TimelineOptions = {
  /** Frames kept; the oldest drop off first. */
  capacity?: number;
  /** Replay speed in frames per second. */
  framesPerSecond?: number;
};

export class Timeline<T extends Frame> {
  private readonly ring: (T | undefined)[];
  private head = 0;
  private size = 0;
  private ghost: readonly T[] = [];
  /** Every kept frame in order, until another is recorded. */
  private kept: readonly T[] | null = null;
  private cursor = -1;
  private playing = false;
  private live = true;
  private carry = 0;
  private run = 0;
  private state: TimelineState;
  private readonly listeners = new Set<() => void>();
  readonly framesPerSecond: number;

  constructor({ capacity = 600, framesPerSecond = 30 }: TimelineOptions = {}) {
    this.ring = new Array<T | undefined>(capacity);
    this.framesPerSecond = framesPerSecond;
    this.state = this.snapshotState();
  }

  /** Adds the newest frame. A live view follows it; a scrubbed view stays put. */
  record(frame: T): void {
    const capacity = this.ring.length;
    this.kept = null;
    this.ring[(this.head + this.size) % capacity] = frame;
    if (this.size < capacity) this.size += 1;
    else {
      this.head = (this.head + 1) % capacity;
      this.cursor = Math.max(0, this.cursor - 1);
    }
    if (this.live) this.cursor = this.size - 1;
    this.changed();
  }

  at(index: number): T | undefined {
    return index < 0 || index >= this.size
      ? undefined
      : this.ring[(this.head + index) % this.ring.length];
  }

  /** Every kept frame, oldest first (for sparklines): the same list until one is recorded. */
  frames(): readonly T[] {
    this.kept ??= Array.from({ length: this.size }, (_, index) => this.at(index) as T);
    return this.kept;
  }

  current(): T | undefined {
    return this.at(this.cursor);
  }

  /** Shows the last frame at or before `epoch` (the oldest kept one if it was dropped). Pauses. */
  scrub(epoch: number): T | undefined {
    let index = 0;
    while (index + 1 < this.size && (this.at(index + 1)?.epoch ?? Infinity) <= epoch) index += 1;
    this.moveTo(index);
    return this.current();
  }

  /** Shows frame `index` directly (a scrubber track position). Pauses. */
  seek(index: number): void {
    this.moveTo(index);
  }

  stepForward(): void {
    this.moveTo(this.cursor + 1);
  }

  stepBack(): void {
    this.moveTo(this.cursor - 1);
  }

  play(): void {
    if (this.cursor >= this.size - 1) this.cursor = 0;
    this.playing = true;
    this.live = false;
    this.carry = 0;
    this.changed();
  }

  pause(): void {
    this.playing = false;
    this.changed();
  }

  /** Jumps back to the newest frame and follows new ones. */
  goLive(): void {
    this.playing = false;
    this.live = true;
    this.cursor = this.size - 1;
    this.changed();
  }

  /** Advances playback by `seconds` of wall time. Reaching the end goes live again. */
  tick(seconds: number): void {
    if (!this.playing) return;
    this.carry += seconds * this.framesPerSecond;
    const whole = Math.floor(this.carry);
    if (whole === 0) return;
    this.carry -= whole;
    if (this.cursor + whole >= this.size - 1) this.goLive();
    else {
      this.cursor += whole;
      this.changed();
    }
  }

  /** Freezes the current run as the ghost (an empty run keeps the old ghost) and starts afresh. */
  newRun(): void {
    if (this.size > 0) this.ghost = this.frames();
    this.kept = null;
    this.ring.fill(undefined);
    this.head = 0;
    this.size = 0;
    this.cursor = -1;
    this.playing = false;
    this.live = true;
    this.run += 1;
    this.changed();
  }

  /** The ghost's frame for the same moment: the last one at or before `epoch`. */
  ghostAt(epoch: number): T | undefined {
    let found: T | undefined;
    for (const frame of this.ghost) {
      if (frame.epoch > epoch) break;
      found = frame;
    }
    return found;
  }

  ghostFrames(): readonly T[] {
    return this.ghost;
  }

  /** For `useSyncExternalStore`: the same object until something changes. */
  getState = (): TimelineState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private moveTo(index: number): void {
    this.cursor = Math.min(this.size - 1, Math.max(0, index));
    this.playing = false;
    this.live = false;
    this.changed();
  }

  private changed(): void {
    this.state = this.snapshotState();
    for (const listener of this.listeners) listener();
  }

  private snapshotState(): TimelineState {
    return {
      cursor: this.cursor,
      length: this.size,
      playing: this.playing,
      live: this.live,
      hasGhost: this.ghost.length > 0,
      run: this.run,
    };
  }
}
