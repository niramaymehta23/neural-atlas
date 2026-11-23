import { capList, clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { TreatsControls } from "./controls";
import { TreatsDrawer } from "./drawer";
import { missions } from "./missions";
import {
  BIG,
  favouriteOf,
  MOST_ROUNDS,
  PLAYFUL,
  RULES,
  trainerTreats,
  TRICKS,
  type DialChange,
  type TreatsFrame,
  type TreatsState,
} from "./model";
import { predictions } from "./predictions";
import { TreatsScene } from "./scene";

const MOST_PUPPIES = 100_000;
/** At most even shares count as "mixes evenly" in the describe line. */
const EVEN = 0.3;

const isTreat = (value: unknown): value is number => value === 0 || value === 1;
const isChange = (value: unknown): value is DialChange =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((part) => typeof part === "number" && Number.isFinite(part));

/** A link's dial log: rounds in order within the rounds played, dials on their dials. */
function parseLog(log: readonly unknown[], rounds: number): DialChange[] {
  const kept: DialChange[] = [];
  for (const [until, big, playful] of capList(log, MOST_ROUNDS, isChange)) {
    const round = clampWhole(until, 1, rounds);
    if (round <= (kept.at(-1)?.[0] ?? 0)) continue;
    kept.push([round, clampNumber(big, BIG.min, BIG.max), clampNumber(playful, 0, 1)]);
  }
  return kept;
}

export const definition = defineModule<TreatsState, TreatsFrame>({
  initialState: {
    treats: [],
    big: BIG.start,
    playful: PLAYFUL.start,
    log: [],
    rule: "sit",
    puppy: 0,
  },
  scene: TreatsScene,
  controls: TreatsControls,
  captions,
  missions,
  predictions,
  underTheHood: TreatsDrawer,
  // The same number of rounds, with treats only for sitting.
  compare: (state) => ({
    ...state,
    treats: trainerTreats({ ...state, treats: [] }, "sit", state.treats.length),
  }),
  parseState: (saved) => {
    const treats = capList(saved.treats, MOST_ROUNDS, isTreat);
    return {
      treats,
      big: clampNumber(saved.big, BIG.min, BIG.max),
      playful: clampNumber(saved.playful, 0, 1),
      log: treats.length === 0 ? [] : parseLog(saved.log, treats.length),
      rule: oneOf(saved.rule, RULES, "sit"),
      puppy: clampWhole(saved.puppy, 0, MOST_PUPPIES),
    };
  },
  describe: (state, frame) => {
    const rounds = words.rounds(state.treats.length);
    if (!frame) return words.describe.even(rounds);
    const { trick, share } = favouriteOf(frame);
    if (share < EVEN) return words.describe.even(rounds);
    return words.describe.favourite(
      rounds,
      words.tricks[TRICKS[trick] ?? "sit"],
      words.often(share),
    );
  },
  trains: true,
});
