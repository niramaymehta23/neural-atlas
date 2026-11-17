import { count } from "@/design/copy";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { GroupsControls } from "./controls";
import { GroupsDrawer } from "./drawer";
import { missions } from "./missions";
import {
  LIMITS,
  MOST_MOVES,
  PILES,
  settled,
  shownStep,
  type GroupsFrame,
  type GroupsState,
} from "./model";
import { predictions } from "./predictions";
import { GroupsScene } from "./scene";

export const definition = defineModule<GroupsState, GroupsFrame>({
  initialState: { piles: "three", spread: 0.3, magnets: 3, attempt: 0, moves: 0 },
  scene: GroupsScene,
  controls: GroupsControls,
  captions,
  missions,
  predictions,
  underTheHood: GroupsDrawer,
  // The same dots and magnets, dropped another way.
  compare: (state) => ({ ...state, attempt: state.attempt === 0 ? 1 : 0 }),
  parseState: (saved, initial) => ({
    piles: oneOf(saved.piles, PILES, initial.piles),
    spread: clampNumber(saved.spread, 0, 1),
    magnets: clampWhole(saved.magnets, LIMITS.magnets.min, LIMITS.magnets.max),
    attempt: clampWhole(saved.attempt, LIMITS.attempt.min, LIMITS.attempt.max),
    moves: clampWhole(saved.moves, 0, MOST_MOVES),
  }),
  describe: (state) => {
    const shown = shownStep(state);
    return words.describe.board(
      state.magnets === 1 ? words.magnets.one : words.magnets.many(count(state.magnets)),
      shown === 0
        ? words.dropped
        : settled(state)
          ? words.stopped
          : words.moved(count(shown), shown === 1),
    );
  },
  trains: true,
});
