/**
 * Confidence next to truth: the storyteller answers a question about one of its animals (always
 * taking the likeliest words), and can be asked where it read that. Its answer is checked against
 * the facts its books really held.
 */
import { continueStory, storyChances, topWords } from "@/engine/language/story";
import { storyIds, type Writers } from "@/engine/language/writers";
import type { TimelineFrame } from "@/platform/contract";

export const KINDS = ["eats", "lives", "colour"] as const;
export type Kind = (typeof KINDS)[number];

export type TruthState = {
  animal: string;
  kind: string;
  /** "Where did you read that?" was asked. */
  source: boolean;
  /** "How sure it must be before answering": below it, it says it doesn't know. */
  need: number;
  /** "How adventurous its words are": 0 always takes the likeliest word. */
  heat: number;
};

export type Truth = "right" | "wrong" | "unknown";

export type TruthFrame = TimelineFrame &
  TruthState & {
    question: string;
    answer: string;
    /** The chance of its first answer word. */
    sure: number;
    truth: Truth;
    /** The book it names when asked, or null. */
    book: string | null;
    /** The book it named really says what it answered. */
    real: boolean;
    /** It named a colour its book never gave. */
    madeUp: boolean;
    /** It wasn't sure enough to answer, so it said it doesn't know. */
    heldBack: boolean;
  };

export const COLOURS = ["brown", "green", "grey", "red", "yellow"];
const MOST_ANSWER = 5;
const MOST_TITLE = 3;
const SOURCE = "where did you read that ? in the book called";
export const HEAT = { min: 0, max: 1.5 } as const;
/** The fixed dice for adventurous answers, so a link always gives the same answer. */
const SEED = 1;

export function questionOf(animal: string, kind: string): { ask: string; prompt: string } {
  if (kind === "lives")
    return { ask: `where does the ${animal} live ?`, prompt: `the ${animal} lives` };
  if (kind === "colour")
    return { ask: `what colour is the ${animal} ?`, prompt: `the ${animal} is` };
  return { ask: `what does the ${animal} eat ?`, prompt: `the ${animal} eats` };
}

/** The words after `ids`, up to a full stop: the likeliest at heat 0, more by chance above it. */
function writeOn(writers: Writers, ids: number[], most: number, heat: number): string[] {
  const teller = writers.storyteller;
  const written = continueStory(teller, ids, most, { heat }, SEED).map(
    (id) => teller.words[id] ?? "",
  );
  const stop = written.indexOf(".");
  return stop < 0 ? written : written.slice(0, stop);
}

export function frameOf(writers: Writers, state: TruthState): Omit<TruthFrame, "epoch"> {
  const facts = writers.animals[state.animal];
  const { ask, prompt } = questionOf(state.animal, state.kind);
  const ids = storyIds(writers.storyteller, `${ask} ${prompt}`) ?? [];
  const sure =
    topWords(writers.storyteller, storyChances(writers.storyteller, ids, { heat: 1 }), 1)[0]
      ?.chance ?? 0;
  const heldBack = sure < state.need;
  const answerWords = heldBack ? [] : writeOn(writers, ids, MOST_ANSWER, state.heat);
  const answer = answerWords.join(" ");
  const fact = !facts
    ? null
    : state.kind === "eats"
      ? facts.eats
      : state.kind === "lives"
        ? facts.lives
        : facts.colour;
  const truth: Truth = heldBack || fact === null ? "unknown" : answer === fact ? "right" : "wrong";
  const answered = storyIds(writers.storyteller, `${ask} ${prompt} ${answer} .`) ?? [];
  const book =
    state.source && !heldBack
      ? writeOn(
          writers,
          [...answered, ...(storyIds(writers.storyteller, SOURCE) ?? [])],
          MOST_TITLE,
          state.heat,
        ).join(" ")
      : null;
  return {
    loss: 0,
    ...state,
    question: `${ask} ${prompt} …`,
    answer: heldBack ? "" : `${prompt} ${answer}`,
    sure,
    truth,
    book,
    real: book !== null && book === facts?.book && truth === "right",
    madeUp: state.kind === "colour" && fact === null && COLOURS.includes(answerWords[0] ?? ""),
    heldBack,
  };
}

/** It named a real book for a colour that book never gives. */
export const fakeSource = (frame: Pick<TruthFrame, "madeUp" | "book">) =>
  frame.madeUp && frame.book !== null && frame.book !== "";
