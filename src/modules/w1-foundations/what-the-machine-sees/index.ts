import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule, type TimelineFrame } from "@/platform/contract";
import { captions, words } from "./captions";
import { SeesControls } from "./controls";
import { SeesDrawer } from "./drawer";
import { missions } from "./missions";
import { averageMiss, closeness, FACTS, type SeesState } from "./model";
import { predictions } from "./predictions";
import { SeesScene } from "./scene";

export const definition = defineModule<SeesState, TimelineFrame>({
  initialState: { told: FACTS.map(() => true), houses: 0.3, jumpy: 0.2, changes: 0 },
  scene: SeesScene,
  controls: SeesControls,
  captions,
  missions,
  predictions,
  underTheHood: SeesDrawer,
  compare: (state) => ({ ...state, told: FACTS.map(() => true) }),
  // One switch per fact, dials on their dials.
  parseState: (saved, initial) => ({
    told: initial.told.map((on, index) =>
      Array.isArray(saved.told) && typeof saved.told[index] === "boolean" ? saved.told[index] : on,
    ),
    houses: clampNumber(saved.houses, 0, 1),
    jumpy: clampNumber(saved.jumpy, 0, 1),
    changes: clampWhole(saved.changes, 0, 100_000),
  }),
  describe: (state) => {
    const told = FACTS.filter((_, index) => state.told[index]).map((fact) =>
      words.facts[fact].toLocaleLowerCase("en-GB"),
    );
    const how = words.overall[closeness(averageMiss(state))];
    if (told.length === 0) return words.describe.nothing(how);
    const list =
      told.length === 1
        ? (told[0] ?? "")
        : `${told.slice(0, -1).join(", ")}${words.describe.and}${told.at(-1) ?? ""}`;
    return words.describe.told(list, how);
  },
});
