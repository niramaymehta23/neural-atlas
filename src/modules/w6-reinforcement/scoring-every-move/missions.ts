import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { bowlFor, pacesOnTreats, TOO_FAST, type ScoringFrame, type ScoringState } from "./model";

/** Settling takes this many tries. */
const SETTLING_TRIES = 150;
/** How much the scores still jump per move when they are not settling. */
const UNSETTLED = 0.06;
/** A loophole counts once the puppy has had this many tries to learn it. */
const LOOPHOLE_TRIES = 30;
/** Tries in a row with no curiosity before "never tries anything new" counts. */
const INCURIOUS_TRIES = 30;

export const missions = [
  {
    id: "too-fast-to-settle",
    ...missionWords.tooFast,
    replay: { before: 30, after: 0 },
    when: (state, frame) =>
      state.learnRate >= TOO_FAST &&
      (frame?.epoch ?? 0) >= SETTLING_TRIES &&
      (frame?.wobble ?? 0) >= UNSETTLED,
  },
  {
    id: "find-a-loophole",
    ...missionWords.loophole,
    replay: { before: 10, after: 0 },
    when: (_state, frame) => !!frame && frame.epoch >= LOOPHOLE_TRIES && pacesOnTreats(frame),
  },
  {
    id: "never-explore",
    ...missionWords.neverExplore,
    replay: { before: 10, after: 0 },
    when: (_state, frame) => (frame?.incurious ?? 0) >= INCURIOUS_TRIES,
  },
  {
    id: "no-way-through",
    ...missionWords.noWayThrough,
    replay: { before: 5, after: 0 },
    // Played on a board whose bowl cannot be reached: built, then tried.
    when: (_state, frame) => !!frame && bowlFor(frame.tiles) === "blocked",
  },
] as const satisfies readonly [
  Mission<ScoringState, ScoringFrame>,
  ...Mission<ScoringState, ScoringFrame>[],
];
