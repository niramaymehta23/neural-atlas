/**
 * Looking things up: the librarian ranks the books by how close their meaning is to the question
 * (average GloVe word places), and the chatbot answers with the closest sentence of the book it
 * is handed, whichever book that is.
 */
import { cosine, meaningOf, type WordPlaces } from "@/engine/language/word-places";
import type { TimelineFrame } from "@/platform/contract";
import { LIBRARY, QUESTIONS } from "./captions";

export type LookState = {
  question: string;
  /** The book handed over by hand, or -1 to let the librarian choose. */
  handed: number;
  /** Look things up before answering. */
  lookUp: boolean;
  /** "How good a match it needs before answering": below it, it says it can't answer. */
  need: number;
  /** "How many books the librarian lists". */
  listed: number;
};

export type LookFrame = TimelineFrame &
  LookState & {
    /** Every book with how well it matches, best first. */
    ranking: { book: number; likeness: number }[];
    /** The book the chatbot answers from, or -1 without looking up. */
    used: number;
    /** Its answer: a sentence from that book, or empty when it refused. */
    answer: string;
    /** The book it was handed matched too poorly, so it said it can't answer. */
    refused: boolean;
    /** The ready-made question's real book, or -1 for a question of your own. */
    truth: number;
  };

export const MOST_LETTERS = 80;
export const NEED = { min: 0, max: 0.95 } as const;

const bookText = (book: (typeof LIBRARY)[number]) => [book.title, ...book.pages].join(" ");

/** Little words every text shares, left out so the librarian matches on the words that matter. */
const LITTLE = new Set(
  "a an and are as at be can do does for from has have how in is it its of on or so that the their there they this to was what when where which who why with".split(
    " ",
  ),
);

/** The average place of the words that matter in `text`. */
const meaningOfText = (places: WordPlaces, text: string) =>
  meaningOf(
    places,
    (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((word) => !LITTLE.has(word)).join(" "),
  );

export function frameOf(places: WordPlaces, state: LookState): Omit<LookFrame, "epoch"> {
  const meaning = meaningOfText(places, state.question);
  const ranking = meaning
    ? LIBRARY.map((book, at) => ({
        book: at,
        likeness: cosine(meaning, meaningOfText(places, bookText(book)) ?? []),
      })).sort((a, b) => b.likeness - a.likeness || a.book - b.book)
    : [];
  const used = !state.lookUp ? -1 : state.handed >= 0 ? state.handed : (ranking[0]?.book ?? -1);
  const match = ranking.find(({ book }) => book === used)?.likeness ?? 0;
  const refused = used >= 0 && state.need > 0 && match < state.need;
  const pages = refused ? [] : (LIBRARY[used]?.pages ?? []);
  let answer = "";
  let best = -Infinity;
  for (const page of pages) {
    const likeness = meaning ? cosine(meaning, meaningOfText(places, page) ?? []) : 0;
    if (likeness > best) {
      best = likeness;
      answer = page;
    }
  }
  const truth = QUESTIONS.find(({ ask }) => ask === state.question)?.book ?? -1;
  return { loss: 0, ...state, ranking, used, answer, refused, truth };
}

/** The librarian's list: the best `listed` books, and the book in use even when it ranks lower. */
export const listedOf = (frame: Pick<LookFrame, "ranking" | "listed" | "used">) =>
  frame.ranking.filter(({ book }, at) => at < frame.listed || book === frame.used);

/** A ready-made question answered from a book that doesn't answer it. */
export const wrongBook = (frame: Pick<LookFrame, "truth" | "used" | "answer">) =>
  frame.truth >= 0 && frame.used >= 0 && frame.used !== frame.truth && frame.answer !== "";
