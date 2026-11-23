import { journeyCaptions } from "./captions";

export const JOURNEYS = Object.keys(
  journeyCaptions.journeys,
) as (keyof typeof journeyCaptions.journeys)[];
export type JourneyId = (typeof JOURNEYS)[number];

export type Stop = {
  /** A lesson's catalog id. */
  lesson: string;
  words: string;
};
export type Journey = {
  id: JourneyId;
  title: string;
  line: string;
  end: string;
  stops: readonly Stop[];
};

/** A journey is nothing but words and catalog ids: the stops are the lessons themselves. */
export function journeyById(id: string): Journey | undefined {
  const known = JOURNEYS.find((journey) => journey === id);
  if (!known) return undefined;
  const { title, line, end, stops } = journeyCaptions.journeys[known];
  return {
    id: known,
    title,
    line,
    end,
    stops: Object.entries(stops).map(([lesson, words]) => ({ lesson, words })),
  };
}

export const journeys: readonly Journey[] = JOURNEYS.flatMap((id) => journeyById(id) ?? []);

/** The stop an address asks for (`#stop=3`, counted from one), kept to the stops there are. */
export function stopFromHash(hash: string, stops: number): number {
  const asked = Number(new URLSearchParams(hash.replace(/^#/, "")).get("stop"));
  if (!Number.isFinite(asked)) return 0;
  return Math.min(Math.max(Math.round(asked) - 1, 0), Math.max(0, stops - 1));
}

export const hashForStop = (stop: number) => `#stop=${stop + 1}`;
