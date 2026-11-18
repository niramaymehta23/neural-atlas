import { capList, clampNumber } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { OrderControls } from "./controls";
import { OrderDrawer } from "./drawer";
import { missions } from "./missions";
import {
  fullOrder,
  MOST_LETTERS,
  MOST_WORDS,
  wordsOf,
  type OrderFrame,
  type OrderState,
} from "./model";
import { predictions } from "./predictions";
import { OrderScene } from "./scene";

const isPlace = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MOST_WORDS;

export const definition = defineModule<OrderState, OrderFrame>({
  initialState: { sentence: words.example, order: [2, 1, 0], strength: 1, speed: 0.5 },
  scene: OrderScene,
  controls: OrderControls,
  captions,
  missions,
  predictions,
  underTheHood: OrderDrawer,
  compare: (state) => ({ ...state, strength: 0 }),
  parseState: (saved) => {
    const sentence = saved.sentence.slice(0, MOST_LETTERS);
    return {
      sentence,
      order: fullOrder(capList(saved.order, MOST_WORDS, isPlace), wordsOf(sentence).length),
      strength: clampNumber(saved.strength, 0, 1),
      speed: clampNumber(saved.speed, 0, 1),
    };
  },
  describe: (state, frame) => {
    const typed = wordsOf(state.sentence);
    const read = fullOrder(state.order, typed.length)
      .map((at) => typed[at] ?? "")
      .join(" ");
    const line = frame?.shuffled ? words.difference(frame.difference) : words.same;
    return words.describe.done(read, line);
  },
});
