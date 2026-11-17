import { count, outOf, sentenceStart } from "@/design/copy";
import { PULL } from "@/features/classic/ClassicGarden";
import { parseGarden, plantGarden } from "@/features/classic/garden";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { RelayControls } from "./controls";
import { RelayDrawer } from "./drawer";
import { missions } from "./missions";
import { curves, GARDENS, LIMITS, wrongness, type RelayFrame, type RelayState } from "./model";
import { predictions } from "./predictions";
import { RelayScene } from "./scene";

/** Gentle pushes: the clear alternative to a hard-pushing team. */
const GENTLE = 0.1;

export const definition = defineModule<RelayState, RelayFrame>({
  initialState: {
    garden: "moons",
    points: plantGarden("moons"),
    brush: 0,
    runners: 0,
    push: 0.3,
    size: 2,
  },
  scene: RelayScene,
  controls: RelayControls,
  captions,
  missions,
  predictions,
  underTheHood: RelayDrawer,
  compare: (state) => ({ ...state, push: state.push > 0.2 ? GENTLE : 1 }),
  parseState: (saved, initial) => ({
    ...parseGarden(saved, GARDENS, initial.garden, PULL + 1),
    runners: clampWhole(saved.runners, LIMITS.runners.min, LIMITS.runners.max),
    push: clampNumber(saved.push, LIMITS.push.min, LIMITS.push.max),
    size: clampWhole(saved.size, LIMITS.size.min, LIMITS.size.max),
  }),
  describe: (state) => {
    if (state.points.length === 0) return words.describe.empty;
    const { relay, own, fresh } = curves(state);
    const wrong = wrongness(relay, state.points, state.runners).filter(
      (value) => value > 0.5,
    ).length;
    return words.describe.relay(
      state.runners === 0
        ? words.noRunners
        : sentenceStart(words.runners(count(state.runners), state.runners === 1)),
      sentenceStart(words.wrong(count(wrong), wrong === 1)),
      outOf(own.at(-1) ?? 0, { noun: "" }),
      fresh ? outOf(fresh.at(-1) ?? 0, { noun: "" }) : null,
    );
  },
  trains: true,
});
