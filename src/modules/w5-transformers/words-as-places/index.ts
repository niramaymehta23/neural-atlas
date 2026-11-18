import { clampNumber } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { PlacesControls } from "./controls";
import { PlacesDrawer } from "./drawer";
import { missions } from "./missions";
import { GUESS, MOST_AMOUNT, tidy, type PlacesFrame, type PlacesState } from "./model";
import { predictions } from "./predictions";
import { PlacesScene } from "./scene";

export const definition = defineModule<PlacesState, PlacesFrame>({
  // Starts at "king" without walking, so the guess is made before the walk is seen.
  initialState: { ...GUESS, amount: 0, skip: true },
  scene: PlacesScene,
  controls: PlacesControls,
  captions,
  missions,
  predictions,
  underTheHood: PlacesDrawer,
  compare: (state) => ({ ...state, skip: !state.skip }),
  parseState: (saved) => ({
    from: tidy(saved.from),
    minus: tidy(saved.minus),
    plus: tidy(saved.plus),
    amount: clampNumber(saved.amount, 0, MOST_AMOUNT),
    skip: saved.skip,
  }),
  describe: (state, frame) => {
    if (!frame) return words.describe.waiting;
    const top = frame.landing[0]?.word;
    if (!frame.known || !top) return words.describe.unknown;
    return words.describe.done(state.from, state.minus, state.plus, top);
  },
});
