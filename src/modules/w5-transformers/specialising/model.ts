/**
 * Fine-tuning: the pretrained letter writer practises on a special style (pirate talk). It picks the
 * style up within a few dozen steps, and forgets its everyday writing unless it keeps rereading some.
 */
import type { WriterMoment, WriterRunConfig } from "@/engine/language/baby-gpt";
import { letterIds, lettersOf, type LetterWriter } from "@/engine/language/writers";
import type { PracticeState } from "@/features/language/use-writer-practice";
import type { TimelineFrame } from "@/platform/contract";

export type TuneState = PracticeState & {
  /** The special style it practises on. */
  text: string;
  /** "How big each practice step is". */
  learning: number;
  /** "How much everyday writing it rereads", 0 to MOST_MIX of what it practises on. */
  mix: number;
};

export type TuneFrame = TimelineFrame & {
  step: number;
  run: string;
  /** Surprise on its everyday writing, which it read before practising. */
  everyday: number;
  sample: string;
};

export const MOST_LETTERS = 600;
export const MOST_STEPS = 400;
export const LEARNING = { min: 0.0005, max: 0.01, start: 0.001 } as const;
export const MOST_MIX = 0.75;
/** Everyday writing it is measured on (never practised on). */
export const MEASURED = 400;
export const PROMPT = "The cat ";
/** Surprise on everyday writing this high means it has forgotten how to write it. */
export const FORGOT = 2;

export const runOf = (state: Pick<TuneState, "text" | "learning" | "mix">) =>
  `${state.learning.toFixed(4)}|${state.mix.toFixed(2)}|${state.text}`;

/** The style, with everyday writing (not the measured part) mixed in to make up `mix` of it. */
export function practiceText(text: string, everyday: string, mix: number): string {
  if (mix <= 0) return text;
  const extra = everyday.slice(MEASURED);
  const wanted = Math.min(extra.length, Math.round((text.length * mix) / (1 - mix)));
  const pieces = extra.slice(0, wanted).split(/(?<=\.) /);
  return [text, ...pieces].join("\n");
}

export function configOf(
  writer: LetterWriter,
  state: Pick<TuneState, "text" | "learning" | "mix">,
): WriterRunConfig | null {
  const style = letterIds(writer, state.text);
  if (style.length < 2) return null;
  return {
    shape: writer.shape,
    base: writer.base,
    text: letterIds(writer, practiceText(state.text, writer.everyday, state.mix)),
    everyday: letterIds(writer, writer.everyday.slice(0, MEASURED)),
    learningRate: state.learning,
    batch: 8,
    seed: 1,
    prompt: letterIds(writer, PROMPT),
    sampleLength: 60,
  };
}

export const frameOf = (
  writer: Pick<LetterWriter, "letters">,
  moment: WriterMoment,
  run: string,
): TuneFrame => ({
  epoch: moment.step,
  step: moment.step,
  loss: moment.loss,
  everyday: moment.everyday ?? 0,
  run,
  sample: lettersOf(writer, moment.sample),
});

export const forgot = (frame: Pick<TuneFrame, "everyday">) => frame.everyday >= FORGOT;

/** Words that only a pirate would write here. */
const PIRATE_WORDS = /\b(be|ye|arr|matey|ahoy|avast|hearties|me)\b/i;
export const talksLikeAPirate = (sample: string) => PIRATE_WORDS.test(sample.slice(PROMPT.length));
