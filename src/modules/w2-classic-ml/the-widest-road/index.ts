import { count, sentenceStart } from "@/design/copy";
import { lampPosts } from "@/engine/ml/svm";
import { PULL } from "@/features/classic/ClassicGarden";
import { isDot, parseGarden } from "@/features/classic/garden";
import { clampNumber, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { RoadControls } from "./controls";
import { RoadDrawer } from "./drawer";
import { missions } from "./missions";
import {
  canBuild,
  GARDENS,
  GROUNDS,
  plantVillages,
  roadOf,
  wrongSide,
  type RoadState,
} from "./model";
import { predictions } from "./predictions";
import { RoadScene } from "./scene";

export const definition = defineModule<RoadState>({
  initialState: {
    garden: "blobs",
    points: plantVillages("blobs"),
    brush: 0,
    strict: 0.5,
    lift: 0.5,
    ground: "flat",
    pulled: null,
  },
  scene: RoadScene,
  controls: RoadControls,
  captions,
  missions,
  predictions,
  underTheHood: RoadDrawer,
  compare: (state) => ({ ...state, ground: state.ground === "flat" ? "bowl" : "flat" }),
  parseState: (saved, initial) => ({
    ...parseGarden(saved, GARDENS, initial.garden, PULL + 1),
    strict: clampNumber(saved.strict, 0, 1),
    lift: clampNumber(saved.lift, 0, 1),
    ground: oneOf(saved.ground, GROUNDS, initial.ground),
    pulled: isDot()(saved.pulled) ? saved.pulled : null,
  }),
  describe: (state) => {
    if (!canBuild(state.points)) return words.describe.empty;
    const road = roadOf(state);
    const posts = lampPosts(road).length;
    const wrong = wrongSide(road, state.points);
    return words.describe
      .road(
        words.posts(count(posts), posts === 1),
        wrong > 0 ? sentenceStart(words.wrong(count(wrong), wrong === 1)) : "",
      )
      .trim();
  },
});
