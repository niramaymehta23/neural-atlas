import { count } from "@/design/copy";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { FriendsControls } from "./controls";
import { FriendsDrawer } from "./drawer";
import { missions } from "./missions";
import { ROUNDS, viewsAfter, type FriendsState } from "./model";
import { GUESS_ROUNDS, predictions } from "./predictions";
import { FriendsScene, howTheyStand, rightLine } from "./scene";

export const definition = defineModule<FriendsState>({
  initialState: { listen: 0.5, rounds: 0 },
  scene: FriendsScene,
  controls: FriendsControls,
  captions,
  missions,
  predictions,
  underTheHood: FriendsDrawer,
  // Few rounds against the most, so spreading and blending sit side by side.
  compare: (state) => ({ ...state, rounds: state.rounds >= 20 ? GUESS_ROUNDS : ROUNDS.max }),
  parseState: (saved) => ({
    listen: clampNumber(saved.listen, 0, 1),
    rounds: clampWhole(saved.rounds, ROUNDS.min, ROUNDS.max),
  }),
  describe: (state) => {
    const views = viewsAfter(state.listen, state.rounds);
    if (state.rounds === 0) return words.start;
    const rounds = state.rounds === 1 ? words.rounds.one : words.rounds.many(count(state.rounds));
    return words.describe(rounds, rightLine(views, state.rounds), howTheyStand(views));
  },
});
