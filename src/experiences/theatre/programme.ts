import { createExplorerShow } from "./explorer-show";
import type { Show } from "./painter";
import { createShapesShow } from "./shapes-show";
import { createWordsShow } from "./words-show";
import type { Storyteller } from "@/engine/language/writers";

export const SHOWS = ["words", "shapes", "explorer"] as const;
export type ShowId = (typeof SHOWS)[number];
export const PROGRAMMES = ["turns", ...SHOWS] as const;
export type Programme = (typeof PROGRAMMES)[number];

/** How long each show plays when they take turns. */
export const TURN_SECONDS = 120;

/** The programme an address asks for (`#show=shapes`); anything else takes turns. */
export function programmeFromHash(hash: string): Programme {
  const asked = new URLSearchParams(hash.replace(/^#/, "")).get("show");
  return PROGRAMMES.find((programme) => programme === asked) ?? "turns";
}

export const hashForProgramme = (programme: Programme) =>
  programme === "turns" ? "" : `#show=${programme}`;

/** The show on now. Without the storyteller, the turns go round the other two. */
export function showAt(programme: Programme, turn: number, hasTeller: boolean): ShowId {
  if (programme !== "turns") return programme;
  const round = hasTeller ? SHOWS : SHOWS.filter((id) => id !== "words");
  return round[turn % round.length] ?? "shapes";
}

/** Builds a show. The same show with the same seed always plays the same way. */
export function buildShow(id: ShowId, teller: Storyteller | null, seed: number): Show | null {
  if (id === "words") return teller ? createWordsShow(teller, seed) : null;
  return id === "shapes" ? createShapesShow(seed) : createExplorerShow(seed);
}
