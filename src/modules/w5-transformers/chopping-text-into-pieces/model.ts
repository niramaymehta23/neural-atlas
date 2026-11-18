/**
 * Chopping text into pieces: GPT-2's byte pieces for the learner's text, with two limits that
 * shrink what the chopper knows. Frames record what is on screen, so the mission and the guess
 * judge what the learner sees.
 */
import { letterCount, piecesOf, type Piece, type PieceSet } from "@/engine/language/bpe";
import type { TimelineFrame } from "@/platform/contract";
import { SAMPLES } from "./captions";

export type PiecesState = {
  text: string;
  /** "How many pieces it knows", 0–1 on the dial (0: single bits only, 1: all of GPT-2's). */
  known: number;
  /** "Longest piece it may use", in letters; LONGEST means any length. */
  longest: number;
};

export type PiecesFrame = TimelineFrame & {
  text: string;
  pieces: number;
  letters: number;
  /** True when every piece is known and any length may be used: GPT-2 as it is. */
  full: boolean;
  /** Whether the text has Gujarati in it (the guess waits for it). */
  gujarati: boolean;
  /** Which greeting costs more with every piece known (the guess's answer). */
  dearer: "english" | "gujarati" | "same";
};

export const MOST_LETTERS = 200;
export const LONGEST = 16;
/** Glue steps in GPT-2's list. */
export const MERGES = 50_000;
/** Bits a chopper with no glue steps knows. */
export const BYTES = 256;
/** Fewest letters for the mission, so one emoji is not "writing". */
export const MISSION_LETTERS = 6;

/** The dial's glue steps: grows fast, so the dial spans none to all of them. */
export const mergesOf = (known: number) =>
  known >= 1
    ? MERGES
    : Math.max(0, Math.round((MERGES + 1) ** Math.min(1, Math.max(0, known)) - 1));

export const limitsOf = ({ known, longest }: Pick<PiecesState, "known" | "longest">) => ({
  known: mergesOf(known),
  longest: longest >= LONGEST ? Infinity : longest,
});

export const isFull = (state: Pick<PiecesState, "known" | "longest">) =>
  mergesOf(state.known) >= MERGES && state.longest >= LONGEST;

export const hasGujarati = (text: string) => /[઀-૿]/u.test(text);

export function chop(set: PieceSet, state: PiecesState): Piece[] {
  return piecesOf(set, state.text.slice(0, MOST_LETTERS), limitsOf(state));
}

export function frameOf(set: PieceSet, state: PiecesState, epoch: number): PiecesFrame {
  const text = state.text.slice(0, MOST_LETTERS);
  return {
    epoch,
    loss: 0,
    text,
    pieces: chop(set, state).length,
    letters: letterCount(text),
    full: isFull(state),
    gujarati: hasGujarati(text),
    dearer: dearerGreeting(set),
  };
}

/** The guess's answer, from the two greetings with every piece known; the dials never change it. */
export function dearerGreeting(set: PieceSet): "english" | "gujarati" | "same" {
  const english = piecesOf(set, SAMPLES.english).length;
  const gujarati = piecesOf(set, SAMPLES.gujarati).length;
  if (Math.abs(english - gujarati) <= 2) return "same";
  return gujarati > english ? "gujarati" : "english";
}

export const costsMore = (frame: Pick<PiecesFrame, "pieces" | "letters">) =>
  frame.pieces > frame.letters;
