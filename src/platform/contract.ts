/**
 * The module contract: what every lesson exports, and the lesson metadata the catalog holds.
 * A lesson's state is plain serialisable data; that shape is also its snapshot format.
 */
import type { ComponentType } from "react";
import type { Frame, Timeline } from "@/engine/timeline/timeline";
import type { Companion } from "./companion/companion";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
/** Declare module state with `type`, not `interface`, so it fits this index signature. */
export type ModuleState = { [key: string]: Json };
/** A recorded moment: training modules record engine snapshots, which carry both fields. */
export type TimelineFrame = Frame & { loss: number };

/**
 * Changes state. Pass `{ touch: false }` for changes the learner did not make (a scene syncing
 * its engine's progress), so they do not count as the first touch.
 */
export type Update<S> = (
  change: Partial<S> | ((state: S) => Partial<S>),
  options?: { touch?: boolean },
) => void;

/** What the shell hands the scene, the controls and the drawer. */
export type ModuleViewProps<S extends ModuleState, F extends TimelineFrame = TimelineFrame> = {
  state: S;
  /** Changes state; the first learner change counts as the first touch (scrubbing does not). */
  update: Update<S>;
  /**
   * Where training is recorded. To restore a snapshot's moment, rebuild recorded frames from
   * state (deterministically, by seed); the shell seeks once that moment exists.
   */
  timeline: Timeline<F>;
  /**
   * "alternative" for the right half of the compare split: its state is `compare(state)`, its
   * `update` does nothing and its timeline is a private one the shell never shows.
   */
  side: "main" | "alternative";
};

/**
 * The words the shell shows. They live in the module's captions.ts, where every word is reviewed
 * by hand: put every other learner-facing word there too (dial names, `describe` words, buttons,
 * scene labels, drawer text) as further exports, and import them in the components.
 */
export type ModuleCaptions = {
  /** The everyday situation the lesson opens on. */
  opening: string;
  /** One line explaining what the learner just felt; appears after the first touch. */
  story: string;
  /** Names for the compare split, when the module offers one. */
  compare?: { label: string; leftLabel: string; rightLabel: string };
};

/** A break-it mission, in the module's missions.ts. */
export type Mission<S extends ModuleState, F extends TimelineFrame = TimelineFrame> = {
  id: string;
  /** The goal in plain words. */
  goal: string;
  hint?: string;
  /** Why it broke, shown once it fires. */
  success: string;
  /**
   * Moments of the timeline replayed around the moment it fired. `moment` picks a different
   * moment to centre on (the epoch something broke, read from the newest frame), and
   * `framesPerSecond` slows the replay down below the timeline's own speed.
   */
  replay: {
    before: number;
    after: number;
    moment?: (frame: F) => number | null;
    framesPerSecond?: number;
  };
  /** True once the learner has broken it; checked against the newest state and moment. */
  when: (state: S, frame: F | undefined) => boolean;
};

export type Choice = { id: string; label: string };

/** A predict-then-reveal moment, in the module's predictions.ts. */
export type Prediction<S extends ModuleState, F extends TimelineFrame = TimelineFrame> = {
  id: string;
  question: string;
  choices: readonly Choice[];
  /** The choice that really happened, or null while it cannot be told yet. */
  answer: (state: S, frame: F | undefined) => string | null;
  /**
   * The guess is about the next run: one placed while a run is on screen waits for a new run
   * before it can be revealed, so it is never a guess made after watching.
   */
  fresh?: boolean;
};

export type ModuleDefinition<S extends ModuleState, F extends TimelineFrame = TimelineFrame> = {
  initialState: S;
  scene: ComponentType<ModuleViewProps<S, F>>;
  /** The plain-named dials, docked beside the scene. */
  controls: ComponentType<ModuleViewProps<S, F>>;
  captions: ModuleCaptions;
  /** At least one: mastering a lesson needs a finished mission. */
  missions: readonly [Mission<S, F>, ...Mission<S, F>[]];
  /** At least one: mastering a lesson needs a revealed prediction. */
  predictions: readonly [Prediction<S, F>, ...Prediction<S, F>[]];
  /** Mechanics and maths for the curious, in a drawer that starts closed. */
  underTheHood?: ComponentType<ModuleViewProps<S, F>>;
  /** The alternative setting drawn on the right of the compare split. */
  compare?: (state: S) => S;
  /** Shows the timeline; set when anything trains. */
  trains?: boolean;
  /**
   * Makes a link's state safe to draw: clamp every number to its dial's range and cap array
   * lengths. Runs after the link's values are matched by key and kind to `initialState`.
   * Required for any module with numeric dials or arrays (a hand-made link can say anything).
   */
  parseState?: (saved: S, initial: S) => S;
  /** Starts from the learner's own network (the companion) when no link is being opened. */
  initialFrom?: (companion: Companion, initial: S) => S;
  /**
   * One plain sentence saying what the scene shows now, read out politely to screen readers
   * when it changes (words from captions.ts). For visuals that have no text of their own.
   */
  describe?: (state: S, frame: F | undefined) => string;
};

/** A module with its state type erased, as the shell and catalog handle it. */
export type LessonModule = ModuleDefinition<ModuleState, TimelineFrame>;

/** Types a module's parts against its state; the result is what the catalog loads. */
export function defineModule<S extends ModuleState, F extends TimelineFrame = TimelineFrame>(
  definition: ModuleDefinition<S, F>,
): LessonModule {
  // Props are contravariant, so a typed module only fits the erased type through this one cast.
  return definition as unknown as LessonModule;
}

export type WorldNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** One lesson's metadata. Its words are learner-facing, except `realTerm`, shown only as the end tag. */
export type LessonEntry = {
  /** Everyday-name slug, used in /learn/[id]. */
  id: string;
  /** Everyday name: "Rolling downhill". */
  title: string;
  /** The real name, shown only as a small tag at the end. */
  realTerm: string;
  /** The everyday idea in one line. */
  idea: string;
  /** What the learner gets to play with. */
  playWith: string;
  prerequisites: readonly string[];
  /** Present once the lesson is built; unbuilt lessons show a locked page. */
  load?: () => Promise<LessonModule>;
};

export type WorldEntry = { world: WorldNumber; title: string; lessons: readonly LessonEntry[] };

export type Lesson = LessonEntry & { world: WorldNumber };
