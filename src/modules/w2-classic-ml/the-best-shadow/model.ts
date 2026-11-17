import { createRandom } from "@/engine/random";
import {
  bestShadow,
  covariance,
  shadowOf,
  shadowShare,
  viewDirection,
  type Vec3,
} from "@/engine/ml/pca";
import { rememberLast } from "@/features/classic/memo";

export const CLOUDS = ["pancake", "cigar", "ball"] as const;
export type Cloud = (typeof CLOUDS)[number];

export type ShadowState = {
  cloud: Cloud;
  /** 0–1, how far the torch has walked round (a full circle). */
  turn: number;
  /** 0–1, how high the torch is: level to straight overhead. */
  tip: number;
};

/** A shadow keeping at most this much of the spread is a bad one. */
export const POOR = 0.25;
/** Torch heights that count as "from the side" and "from above" for the guess. */
export const SIDE = 0.2;
export const ABOVE = 0.8;
const POINTS = 120;

const round = (value: number) => Math.round(value * 1000) / 1000;
const DIAGONAL: Vec3 = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];

export const cloudOf = rememberLast((cloud: Cloud): Vec3[] => {
  const random = createRandom(11);
  return Array.from({ length: POINTS }, (): Vec3 => {
    if (cloud === "pancake")
      return [random.normal() * 0.45, random.normal() * 0.04, random.normal() * 0.45];
    if (cloud === "ball")
      return [random.normal() * 0.3, random.normal() * 0.3, random.normal() * 0.3];
    const along = random.normal() * 0.5;
    return [
      along * DIAGONAL[0] + random.normal() * 0.05,
      along * DIAGONAL[1] + random.normal() * 0.05,
      along * DIAGONAL[2] + random.normal() * 0.05,
    ];
  });
});

export const spreadOf = rememberLast((cloud: Cloud) => covariance(cloudOf(cloud)));

/** Radians from the dials. */
export const turnOf = (turn: number) => turn * 2 * Math.PI;
export const tipOf = (tip: number) => (tip * Math.PI) / 2;

export const shadowPoints = (state: ShadowState) =>
  shadowOf(cloudOf(state.cloud), turnOf(state.turn), tipOf(state.tip));

/** The share of the cloud's spread this shadow keeps, 0–1. */
export const shareOf = (state: ShadowState) =>
  shadowShare(spreadOf(state.cloud), viewDirection(turnOf(state.turn), tipOf(state.tip)));

/** The dial settings for the best shadow (the torch along the cloud's thinnest way). */
export function bestDials(cloud: Cloud): Pick<ShadowState, "turn" | "tip"> {
  let { turn, tip } = bestShadow(spreadOf(cloud));
  // A torch from below makes the same shadow as one from above on the other side.
  if (tip < 0) {
    tip = -tip;
    turn += Math.PI;
  }
  const whole = 2 * Math.PI;
  return {
    turn: round((((turn % whole) + whole) % whole) / whole),
    tip: round(tip / (Math.PI / 2)),
  };
}

/** The guess's answer: once the learner looks at the pancake from above or the side. */
export function pancakeAnswer(state: ShadowState): "above" | "side" | null {
  if (state.cloud !== "pancake" || (state.tip > SIDE && state.tip < ABOVE)) return null;
  const above = shareOf({ ...state, tip: 1 });
  const side = shareOf({ ...state, tip: 0 });
  return above >= side ? "above" : "side";
}
